// Edge Function: send-emails
// Location: supabase/functions/send-emails/index.ts
// This function processes the email queue and sends emails using Resend

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface EmailQueueItem {
    id: string;
    recipient_email: string;
    subject: string;
    html_content: string;
    template_type: string;
    user_id: string;
    job_id?: string;
    alert_id?: string;
    retry_count: number;
    max_retries: number;
    metadata: Record<string, any>;
}

interface ResendResponse {
    id: string;
    from: string;
    to: string[];
    created_at: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'CSS Jobs <noreply@cssjobs.org>';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    try {
        console.log('Starting email queue processing...');

        // Get pending emails from queue (limit to 50 per batch)
        const { data: pendingEmails, error: fetchError } = await supabase
            .from('email_queue')
            .select('*')
            .is('sent_at', null)
            .is('failed_at', null)
            .lte('scheduled_for', new Date().toISOString())
            .order('scheduled_for', { ascending: true })
            .limit(50);

        if (fetchError) {
            console.error('Error fetching pending emails:', fetchError);
            return new Response(JSON.stringify({ error: 'Failed to fetch emails' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!pendingEmails || pendingEmails.length === 0) {
            console.log('No pending emails to process');
            return new Response(JSON.stringify({
                message: 'No pending emails',
                processed: 0,
                failed: 0
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Processing ${pendingEmails.length} emails...`);

        let processedCount = 0;
        let failedCount = 0;
        const results = [];

        // Process each email
        for (const email of pendingEmails as EmailQueueItem[]) {
            try {
                console.log(`Sending email ${email.id} to ${email.recipient_email}`);

                // Send email via Resend
                const emailResult = await sendEmail(email);

                if (emailResult.success) {
                    // Mark as sent
                    await markEmailAsSent(email.id, emailResult.messageId);
                    processedCount++;
                    results.push({
                        id: email.id,
                        status: 'sent',
                        messageId: emailResult.messageId
                    });
                    console.log(`Email ${email.id} sent successfully`);
                } else {
                    throw new Error(emailResult.error);
                }

            } catch (error) {
                console.error(`Failed to send email ${email.id}:`, error);

                // Mark as failed or retry
                await handleEmailFailure(email, error.message);
                failedCount++;
                results.push({
                    id: email.id,
                    status: 'failed',
                    error: error.message,
                    retryCount: email.retry_count + 1
                });
            }
        }

        console.log(`Email processing complete. Sent: ${processedCount}, Failed: ${failedCount}`);

        return new Response(JSON.stringify({
            message: 'Email processing complete',
            processed: processedCount,
            failed: failedCount,
            results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in email processing:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

async function sendEmail(email: EmailQueueItem): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [email.recipient_email],
                subject: email.subject,
                html: email.html_content,
                // Add unsubscribe header for job alerts
                ...(email.template_type === 'job_alert' && {
                    headers: {
                        'List-Unsubscribe': `<${SUPABASE_URL}/unsubscribe?user_id=${email.user_id}&alert_id=${email.alert_id}>`
                    }
                })
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `Resend API error: ${response.status} - ${errorText}` };
        }

        const result: ResendResponse = await response.json();
        return { success: true, messageId: result.id };

    } catch (error) {
        return { success: false, error: `Network error: ${error.message}` };
    }
}

async function markEmailAsSent(emailId: string, messageId: string): Promise<void> {
    const { error } = await supabase
        .from('email_queue')
        .update({
            sent_at: new Date().toISOString(),
            metadata: { messageId }
        })
        .eq('id', emailId);

    if (error) {
        console.error(`Failed to mark email ${emailId} as sent:`, error);
        throw error;
    }
}

async function handleEmailFailure(email: EmailQueueItem, errorMessage: string): Promise<void> {
    const newRetryCount = email.retry_count + 1;

    if (newRetryCount >= email.max_retries) {
        // Mark as permanently failed
        const { error } = await supabase
            .from('email_queue')
            .update({
                failed_at: new Date().toISOString(),
                failure_reason: errorMessage,
                retry_count: newRetryCount
            })
            .eq('id', email.id);

        if (error) {
            console.error(`Failed to mark email ${email.id} as failed:`, error);
        }
    } else {
        // Schedule for retry with exponential backoff
        const retryDelay = Math.pow(2, newRetryCount) * 5; // 10, 20, 40 minutes
        const scheduledFor = new Date(Date.now() + retryDelay * 60 * 1000);

        const { error } = await supabase
            .from('email_queue')
            .update({
                retry_count: newRetryCount,
                failure_reason: errorMessage,
                scheduled_for: scheduledFor.toISOString()
            })
            .eq('id', email.id);

        if (error) {
            console.error(`Failed to schedule email ${email.id} for retry:`, error);
        } else {
            console.log(`Email ${email.id} scheduled for retry ${newRetryCount} at ${scheduledFor}`);
        }
    }
} 