import Image from "next/image";

type AppLogoProps = {
  size?: number;
  className?: string;
};

export function AppLogo({ size = 36, className = "" }: AppLogoProps) {
  return (
    <Image
      src="/mpstme-logo.png"
      alt="MPSTME Canteen Pay logo"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`}
      priority
    />
  );
}
