import { cva, type VariantProps } from "class-variance-authority";

// Typography variants
export const typographyVariants = cva("", {
	variants: {
		variant: {
			h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
			h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
			h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
			h4: "scroll-m-20 text-xl font-semibold tracking-tight",
			h5: "scroll-m-20 text-lg font-semibold tracking-tight",
			body: "leading-7 [&:not(:first-child)]:mt-6",
			muted: "text-sm text-muted-foreground",
		},
	},
	defaultVariants: {
		variant: "body",
	},
});

export type TypographyProps = VariantProps<typeof typographyVariants>;

// Spinner variants
export const spinnerVariants = cva("", {
	variants: {
		size: {
			sm: "h-4 w-4",
			md: "h-6 w-6",
			lg: "h-8 w-8",
			xl: "h-12 w-12",
		},
		color: {
			primary: "text-primary",
			secondary: "text-secondary",
			success: "text-green-500",
			warning: "text-yellow-500",
			danger: "text-red-500",
			default: "text-foreground",
		},
		variant: {
			dots: "",
			spinner: "",
			wave: "",
			gradient: "",
			default: "animate-spin",
		},
	},
	defaultVariants: {
		size: "md",
		color: "primary",
		variant: "default",
	},
});

export type SpinnerProps = VariantProps<typeof spinnerVariants>;

// Avatar variants
export const avatarVariants = cva(
	"relative flex shrink-0 overflow-hidden rounded-full",
	{
		variants: {
			size: {
				sm: "h-8 w-8",
				md: "h-10 w-10",
				lg: "h-12 w-12",
				xl: "h-16 w-16",
			},
		},
		defaultVariants: {
			size: "md",
		},
	}
);
