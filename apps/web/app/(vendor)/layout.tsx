import { VendorShell } from "../../components/layout/vendor-shell";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <VendorShell>{children}</VendorShell>;
}
