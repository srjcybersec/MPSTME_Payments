import { RoleLoginForm } from "../../../../components/auth/role-login-form";

export default function VendorLoginPage() {
  return (
    <RoleLoginForm
      roleLabel="Vendor"
      title="Welcome back, vendor"
      description="Sign in to handle queue management, orders, payments, and student operations."
      defaultEmail="canteen@mpstme.edu"
      defaultPassword="Vendor@1234"
      alternateHref="/login/student"
      alternateLabel="Switch to Student Login"
    />
  );
}
