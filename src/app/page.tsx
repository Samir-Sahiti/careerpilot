export default function Home() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <main className="flex flex-col items-center gap-6 text-center px-8">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                    CareerPilot
                </h1>
                <p className="max-w-md text-lg text-foreground/60">
                    Your AI-powered career copilot. Upload your CV, analyse job fits,
                    practice interviews, and map your career ladder — all in one place.
                </p>
            </main>
        </div>
    );
}
