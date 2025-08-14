import { BrowserRouter } from "react-router-dom";
import AdminPage from "./app/a/page";

export default function Main() {
  return (
    <BrowserRouter>
      <AdminPage />
    </BrowserRouter>
  );
}