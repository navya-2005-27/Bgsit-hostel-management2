import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Index() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-white dark:to-background">
      <img
        src="https://cdn.builder.io/api/v1/image/assets%2F899b01c40c4f484a80794cbef47f0df5%2F56d4ed04cae048d9944acd5edaba922c?format=webp&width=1600"
        alt="BGSIT campus"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover blur-[0.5px] brightness-100 dark:brightness-75 scale-105"
      />
      {/* Background decorations */}
      <div
        className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(1200px_600px_at_50%_-10%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_75%)]"
        aria-hidden="true"
      />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <span className="hidden mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-xs font-semibold tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Welcome to CampusStay
        </span>
        <h1 className="mx-auto max-w-4xl text-pretty text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          BGSIT-Hostel-Management
        </h1>
        <div className="hidden bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 bg-clip-text font-extrabold"></div>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg">
          <span className="text-black dark:text-white">
            Seamless entry for students. Powerful controls for wardens.
            Beautifully crafted for speed and clarity.
          </span>
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="group mt-10 h-12 rounded-full bg-gradient-to-r from-primary to-fuchsia-600 px-8 text-base shadow-[0_10px_30px_-10px_hsl(var(--primary)/.6)] transition-transform hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-none bg-gradient-to-b from-background/90 to-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose your role</DialogTitle>
              <DialogDescription>
                Select how you want to log in. Each role gets a tailored
                experience.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <LoginOption
                title="Login as Student"
                description="Quick access to your passes, requests, and updates."
                icon={<GraduationCap className="h-6 w-6" />}
                gradient="from-emerald-500 via-emerald-600 to-teal-500"
                onClick={() => {
                  toast({
                    title: "Student login",
                    description: "Proceeding as Student.",
                  });
                  setOpen(false);
                  navigate("/student");
                }}
              />

              <LoginOption
                title="Login as Warden"
                description="Approve requests, manage residents, and view reports."
                icon={<Shield className="h-6 w-6" />}
                gradient="from-indigo-500 via-violet-600 to-fuchsia-500"
                onClick={() => {
                  toast({
                    title: "Warden login",
                    description: "Proceeding as Warden.",
                  });
                  setOpen(false);
                  navigate("/warden");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Subtle footer note */}
        <p className="hidden mt-14 text-xs text-muted-foreground/80">
          CampusStay • Crafted with care
        </p>
      </main>
    </div>
  );
}

function LoginOption({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-transparent bg-card/80 p-0 shadow-lg transition-all hover:shadow-xl",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-to-r before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100",
        `before:from-primary/40 before:via-fuchsia-500/40 before:to-cyan-400/40`,
      )}
    >
      <CardHeader className="p-6 pb-4">
        <div
          className={cn(
            "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg",
            `bg-gradient-to-br ${gradient}`,
          )}
        >
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <Button
          className={cn(
            "w-full rounded-lg bg-gradient-to-r text-white transition-all",
            `${gradient} hover:brightness-110`,
          )}
          onClick={onClick}
        >
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
