import Home from "@/components/pages/home";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Page() {
	return (
		<TooltipProvider>
			<Home />
			<Toaster />
		</TooltipProvider>
	);
}
