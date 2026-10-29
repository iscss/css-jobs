import { Navigate, useLocation } from "react-router-dom";

// The jobs list lives at "/". Old /jobs links (bookmarks, emails, search URLs
// like /jobs?search=postdoc) keep working and land on "/" with the query kept.
const LegacyJobsRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/", search }} replace />;
};

export default LegacyJobsRedirect;
