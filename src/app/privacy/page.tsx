import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
}

export default function PrivacyPage() {
  const updated = '13 mai 2026'

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display mb-2 text-3xl font-bold">Politique de confidentialité</h1>
      <p className="text-muted-foreground mb-10 text-sm">Dernière mise à jour : {updated}</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 text-base font-semibold">1. Responsable du traitement</h2>
          <p className="text-muted-foreground">
            Kickboxd est un service exploité à titre personnel. Pour toute question relative à vos
            données personnelles, contactez-nous à :{' '}
            <a href="mailto:contact@kickbox.app" className="text-foreground underline">
              contact@kickbox.app
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">2. Données collectées</h2>
          <p className="text-muted-foreground mb-3">Nous collectons les données suivantes :</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Données de compte :</strong> adresse e-mail, nom
              d&apos;utilisateur, mot de passe (chiffré)
            </li>
            <li>
              <strong className="text-foreground">Données de profil :</strong> nom affiché,
              biographie, photo de profil (optionnel)
            </li>
            <li>
              <strong className="text-foreground">Données d&apos;activité :</strong> matchs loggés,
              notes, reviews, watchlist, listes personnalisées
            </li>
            <li>
              <strong className="text-foreground">Données sociales :</strong> abonnements,
              commentaires, likes
            </li>
            <li>
              <strong className="text-foreground">Données techniques :</strong> logs de connexion,
              adresse IP (gérés par Supabase)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">3. Finalités du traitement</h2>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>Fourniture et amélioration du service Kickboxd</li>
            <li>Gestion de votre compte et authentification</li>
            <li>Affichage de votre profil public et de votre activité</li>
            <li>Notifications liées à votre activité sur la plateforme</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">4. Base légale</h2>
          <p className="text-muted-foreground">
            Le traitement de vos données repose sur votre consentement lors de la création de votre
            compte (article 6.1.a RGPD) et sur l&apos;exécution du contrat de service (article 6.1.b
            RGPD).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">5. Conservation des données</h2>
          <p className="text-muted-foreground">
            Vos données sont conservées pendant toute la durée d&apos;existence de votre compte. À
            la suppression de votre compte, toutes vos données personnelles sont définitivement
            effacées dans un délai de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">6. Partage des données</h2>
          <p className="text-muted-foreground">
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être transmises à nos
            sous-traitants techniques :
          </p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Supabase</strong> — hébergement de la base de
              données et authentification (UE/US)
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — hébergement de
              l&apos;application (US)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">7. Vos droits (RGPD)</h2>
          <p className="text-muted-foreground mb-2">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Accès</strong> — consulter vos données
              personnelles
            </li>
            <li>
              <strong className="text-foreground">Rectification</strong> — modifier vos informations
              depuis les Paramètres
            </li>
            <li>
              <strong className="text-foreground">Effacement</strong> — supprimer votre compte
              depuis les Paramètres
            </li>
            <li>
              <strong className="text-foreground">Portabilité</strong> — obtenir une copie de vos
              données sur demande
            </li>
            <li>
              <strong className="text-foreground">Opposition</strong> — vous opposer à certains
              traitements
            </li>
          </ul>
          <p className="text-muted-foreground mt-3">
            Pour exercer ces droits, contactez-nous à{' '}
            <a href="mailto:contact@kickbox.app" className="text-foreground underline">
              contact@kickbox.app
            </a>
            . Vous pouvez également déposer une plainte auprès de la{' '}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline"
            >
              CNIL
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">8. Cookies</h2>
          <p className="text-muted-foreground">
            Kickboxd utilise uniquement des cookies strictement nécessaires au fonctionnement du
            service (gestion de session d&apos;authentification). Aucun cookie publicitaire ou de
            tracking n&apos;est utilisé.
          </p>
        </section>
      </div>

      <div className="border-border mt-12 border-t pt-6">
        <Link
          href="/terms"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          Conditions d&apos;utilisation →
        </Link>
      </div>
    </div>
  )
}
