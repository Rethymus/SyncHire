import { Button } from "@/components/ui/button";
import {
  FileText,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const tApp = await getTranslations({ locale, namespace: 'app' });

  const features = [
    {
      nameKey: "features.smartOptimization.title",
      descriptionKey: "features.smartOptimization.description",
      icon: Sparkles,
    },
    {
      nameKey: "features.jobMatching.title",
      descriptionKey: "features.jobMatching.description",
      icon: Target,
    },
    {
      nameKey: "features.oneClickGeneration.title",
      descriptionKey: "features.oneClickGeneration.description",
      icon: FileText,
    },
    {
      nameKey: "features.realTimePreview.title",
      descriptionKey: "features.realTimePreview.description",
      icon: Zap,
    },
    {
      nameKey: "features.dataInsights.title",
      descriptionKey: "features.dataInsights.description",
      icon: BarChart3,
    },
    {
      nameKey: "features.secureReliable.title",
      descriptionKey: "features.secureReliable.description",
      icon: Shield,
    },
  ];

  const benefits = [
    "benefits.increaseInterviewRate",
    "benefits.saveTime",
    "benefits.multipleFormats",
    "benefits.bilingualSupport",
    "benefits.unlimitedGeneration",
    "benefits.aiAssistant",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      

      <main>
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden pt-14">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.100),white)] opacity-20" />
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-400 to-blue-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  {t('hero.title')}
                  <br />
                  <span className="text-blue-600">{t('hero.titleHighlight')}</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-700">
                  {t('hero.description')}
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Button size="lg" className="text-base" asChild>
                    <Link href="/signup">
                      {t('hero.cta.primary')}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base" asChild>
                    <Link href="/demo">{t('hero.cta.secondary')}</Link>
                  </Button>
                </div>
                <div className="mt-8 flex items-center justify-center gap-x-6 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{t('hero.socialProof')}</span>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-500" />
                      <dd className="text-sm font-medium leading-6 text-gray-900">
                        {t(benefit as any)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">
                {t('features.sectionTitle')}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t('features.sectionSubtitle')}
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-700">
                {t('features.sectionDescription')}
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.nameKey} className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                        <feature.icon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      {t(feature.nameKey as any)}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-700">
                      {t(feature.descriptionKey as any)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative isolate overflow-hidden bg-blue-600 py-24 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.400),white)] opacity-20" />
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-400 to-blue-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('cta.title')}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
                {t('cta.description')}
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button size="lg" variant="secondary" className="text-base" asChild>
                  <Link href="/signup">
                    {t('cta.button')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">{tApp('name')}</span>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-gray-700">
              {t('footer.copyright')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
