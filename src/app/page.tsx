import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Logo from '@/components/icons/logo';
import { BarChart, Trash2, Wind } from 'lucide-react';

export default function LandingPage() {

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm bg-card">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <Logo className="h-6 w-auto text-primary" />
          <span className="sr-only">DrainSentry</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button asChild variant="ghost">
            <Link href="/login">
              Login
            </Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Sign Up
            </Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="px-4 md:px-6 space-y-10 xl:space-y-16">
            <div className="grid max-w-[1300px] mx-auto gap-4 px-4 sm:px-6 md:px-10 md:grid-cols-2 md:gap-16">
              <div>
                <h1 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem] font-headline">
                  Intelligent Monitoring for Modern Sanitation
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mt-4">
                  DrainSentry provides real-time data on water, waste, and gas levels, empowering cities with the insights to build smarter, cleaner, and more efficient infrastructure.
                </p>
                <div className="mt-6 space-x-4">
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#">
                      Contact Sales
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center items-center">
                  <Image
                    src="/drainSentryHero.png"
                    alt="DrainSentry Hero Image"
                    width={1200}
                    height={800}
                    className="mx-auto overflow-hidden rounded-xl"
                  />
              </div>
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container space-y-12 px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  A Complete View of Your City's Health
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our integrated platform offers a suite of tools to monitor critical infrastructure and environmental conditions across your entire system.
                </p>
              </div>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <BarChart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Water Level Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track real-time water levels in sewer systems with predictive analytics to prevent overflows and manage flow efficiently.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Trash2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Waste Bin Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Optimize waste collection routes and schedules by monitoring fill levels of public and commercial waste bins.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Wind className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Methane Gas Detection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ensure public safety and environmental compliance by monitoring methane concentrations within sewer lines.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DrainSentry. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
