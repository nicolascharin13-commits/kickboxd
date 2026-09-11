import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
}

export default function TermsPage() {
  const updated = '13 mai 2026'

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display mb-2 text-3xl font-bold">Conditions d&apos;utilisation</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        Dernière mise à jour : {updated} — Mentions légales incluses
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        {/* Mentions légales */}
        <section className="border-border rounded-lg border p-5">
          <h2 className="mb-3 text-base font-semibold">Mentions légales</h2>
          <div className="text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Nom du service :</strong> Kickboxd
            </p>
            <p>
              <strong className="text-foreground">Nature :</strong> Service web de tracking de
              matchs de football
            </p>
            <p>
              <strong className="text-foreground">Contact :</strong>{' '}
              <a href="mailto:contact@kickbox.app" className="text-foreground underline">
                contact@kickbox.app
              </a>
            </p>
            <p>
              <strong className="text-foreground">Hébergement :</strong> Vercel Inc., 340 Pine
              Street Suite 701, San Francisco, CA 94104, USA
            </p>
            <p>
              <strong className="text-foreground">Base de données :</strong> Supabase Inc.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">1. Objet</h2>
          <p className="text-muted-foreground">
            Kickboxd est une plateforme permettant aux utilisateurs de logger, noter et partager les
            matchs de football qu&apos;ils ont regardés. En créant un compte, vous acceptez les
            présentes conditions d&apos;utilisation dans leur intégralité.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">2. Accès au service</h2>
          <p className="text-muted-foreground">
            Le service est accessible gratuitement à toute personne disposant d&apos;un accès à
            Internet. La création d&apos;un compte est nécessaire pour accéder aux fonctionnalités
            personnalisées (journal, reviews, listes, social). Vous devez avoir au moins 13 ans pour
            créer un compte.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">3. Compte utilisateur</h2>
          <p className="text-muted-foreground">
            Vous êtes responsable de la confidentialité de vos identifiants de connexion. Votre nom
            d&apos;utilisateur doit être unique, ne pas imiter un tiers, et respecter les règles de
            contenu ci-dessous. Nous nous réservons le droit de suspendre ou supprimer tout compte
            en violation des présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">4. Règles de contenu</h2>
          <p className="text-muted-foreground mb-2">Il est interdit de publier du contenu :</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>Illégal, diffamatoire, injurieux ou harcelant</li>
            <li>Raciste, discriminatoire ou haineux</li>
            <li>Pornographique ou à caractère sexuel explicite</li>
            <li>Portant atteinte aux droits d&apos;auteur ou aux droits de tiers</li>
            <li>Constituant du spam ou de la publicité non sollicitée</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">5. Propriété intellectuelle</h2>
          <p className="text-muted-foreground">
            Le code source, le design et la marque Kickboxd sont protégés. Les données de matchs
            proviennent de sources tierces (football-data.org, API-Football) soumises à leurs
            propres licences. Vos reviews et contenus vous appartiennent ; en les publiant, vous
            nous accordez une licence non-exclusive d&apos;affichage sur la plateforme.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">6. Disponibilité</h2>
          <p className="text-muted-foreground">
            Kickboxd est fourni &quot;en l&apos;état&quot;, sans garantie de disponibilité continue.
            Nous nous réservons le droit de modifier, suspendre ou interrompre le service à tout
            moment, sans préavis. Nous ne sommes pas responsables des pertes de données liées à une
            interruption de service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">7. Limitation de responsabilité</h2>
          <p className="text-muted-foreground">
            Kickboxd ne saurait être tenu responsable des dommages directs ou indirects résultant de
            l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service. Vous utilisez
            Kickboxd à vos propres risques.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">8. Modification des conditions</h2>
          <p className="text-muted-foreground">
            Ces conditions peuvent être modifiées à tout moment. La date de mise à jour sera
            indiquée en haut de cette page. L&apos;utilisation continue du service après
            modification vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">9. Droit applicable</h2>
          <p className="text-muted-foreground">
            Les présentes conditions sont régies par le droit français. Tout litige sera soumis aux
            juridictions compétentes françaises.
          </p>
        </section>
      </div>

      <div className="border-border mt-12 border-t pt-6">
        <Link
          href="/privacy"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          Politique de confidentialité →
        </Link>
      </div>
    </div>
  )
}
