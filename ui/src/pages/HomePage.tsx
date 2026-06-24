import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CategoryGrid } from "../components/Products/CategoryGrid";
import { Shield, Users, Zap } from "lucide-react";
import { Hero } from "@/components/section/Hero";
import { FeaturedProducts } from "./FeaturedProducts";

export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-12">
      <Hero />
      {/* Categories Section */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t("home.categories.title")}
          </h2>
          <p className="text-gray-600">{t("home.categories.subtitle")}</p>
        </div>
        <CategoryGrid />
      </section>

      {/* featuredproducts Section */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t("home.categories.featuredproducts")}
          </h2>
          <p className="text-gray-600">{t("home.categories.subtitle")}</p>
        </div>
        <FeaturedProducts />
      </section>

      {/* Features Section */}
      <section className="bg-white rounded-2xl p-12 shadow-sm">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            {t("home.features.title")}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            {t("home.features.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Card */}
          <div className="bg-gray-50 rounded-xl p-8 text-center transition-transform transform hover:-translate-y-2 hover:shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500/10 to-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110">
              <Shield className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {t("home.features.secureTrading.title")}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t("home.features.secureTrading.description")}
            </p>
          </div>

          {/* Card */}
          <div className="bg-gray-50 rounded-xl p-8 text-center transition-transform transform hover:-translate-y-2 hover:shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-green-500/10 to-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {t("home.features.localCommunity.title")}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t("home.features.localCommunity.description")}
            </p>
          </div>

          {/* Card */}
          <div className="bg-gray-50 rounded-xl p-8 text-center transition-transform transform hover:-translate-y-2 hover:shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-500/10 to-orange-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {t("home.features.fastEasy.title")}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t("home.features.fastEasy.description")}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">{t("home.cta.title")}</h2>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          {t("home.cta.subtitle")}
        </p>
        <Link
          to="/signup"
          className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium inline-block"
        >
          {t("home.cta.button")}
        </Link>
      </section>
    </div>
  );
}
