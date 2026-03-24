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
      mobileOffset={{ top: 50, right: 16, left: 16, bottom: 16 }}
      duration={3200}
      toastOptions={{
        classNames: {
          toast:
            "group toast flex w-full max-w-[calc(100vw-2rem)] sm:w-fit sm:max-w-[28rem] lg:max-w-[34rem] rounded-xl px-4 py-3 group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",

          description:
            "group-[.toast]:text-muted-foreground leading-relaxed whitespace-normal break-normal",
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
