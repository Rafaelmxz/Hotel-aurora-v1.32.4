import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useProperty } from "./useProperty";

export function HotelBrand({ className }: { className?: string }) {
  const { data } = useProperty();
  if (data.logoUrl) {
    return (
      <img
        src={data.logoUrl}
        alt=""
        className={cn("size-8 rounded-lg object-cover", className)}
      />
    );
  }
  return <Logo className={className} />;
}

export function useHotelName() {
  const { data } = useProperty();
  return data.name;
}
