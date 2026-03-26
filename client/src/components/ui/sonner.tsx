import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={{ top: 68, right: 20, left: 20, bottom: 20 }}
      mobileOffset={{ top: 72, right: 20, left: 20, bottom: 20 }}
      duration={3600}
      toastOptions={{
        classNames: {
          toast:
            "group toast flex w-fit max-w-[min(88vw,30rem)] rounded-2xl border border-border/55 px-4 py-3 backdrop-blur-md group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:shadow-[var(--shadow-card)]",

          description:
            "group-[.toast]:text-muted-foreground leading-relaxed whitespace-normal break-words",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:border group-[.toast]:border-border group-[.toast]:bg-muted/70 group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
