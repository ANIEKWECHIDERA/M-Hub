import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={{ top: 50, right: 16, left: 16, bottom: 16 }}
      mobileOffset={{ top: 50, right: 16, left: 160, bottom: 16 }}
      duration={3200}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-fit max-w-[min(calc(100vw-2rem),14rem)] rounded-xl group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg sm:max-w-[16rem] lg:max-w-[18rem]",
          description:
            "group-[.toast]:text-muted-foreground break-words leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
