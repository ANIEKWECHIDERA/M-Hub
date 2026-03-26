import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type MotionSurfaceProps = HTMLMotionProps<"div">;

export function MotionSurface({
  className,
  children,
  ...props
}: MotionSurfaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
      className={cn("premium-interactive", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
