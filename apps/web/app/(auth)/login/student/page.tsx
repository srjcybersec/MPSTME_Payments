import { RoleLoginForm } from "../../../../components/auth/role-login-form";

export default function StudentLoginPage() {
  return (
    <RoleLoginForm
      roleLabel="Student"
      title="Welcome back, student"
      description="Sign in to order food quickly, manage wallet balance, and track your canteen activity."
      defaultEmail="student1@nmims.edu"
      defaultPassword="Student@1234"
      alternateHref="/login/vendor"
      alternateLabel="Switch to Vendor Login"
    />
  );
}
