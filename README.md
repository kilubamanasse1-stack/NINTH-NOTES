# 9TH NOTE

Application web installable pour enregistrer, organiser, transcrire et partager des cours.

## Fonctionnalités
- Enregistrement audio avec pause, reprise et sauvegarde locale dans IndexedDB.
- Classement par matière, recherche, notes modifiables.
- Transcription après l'enregistrement avec Whisper Tiny multilingue via Transformers.js, exécuté dans le navigateur.
- Export du texte, des métadonnées et de l'audio.
- Interface PWA avec cache des fichiers de l'application.

## Transcription et confidentialité
Le fichier audio est décodé et traité dans le navigateur. Le code applicatif ne téléverse pas l'audio vers un serveur de transcription. Lors de la première utilisation, le moteur et les fichiers du modèle doivent être téléchargés depuis le CDN et le dépôt du modèle. Transformers.js utilise le cache du navigateur, mais iOS peut purger ce cache : le mode avion après téléchargement doit être testé sur l'appareil avant de compter sur une disponibilité hors ligne durable.

La transcription démarre après l'enregistrement, pas en direct pendant le cours. Le modèle Whisper Tiny peut être lent sur un iPhone X ; la mémoire disponible, la durée du cours et le format audio influencent le résultat. Une relecture est nécessaire, notamment pour les noms propres, chiffres et termes scientifiques.

## Limites iOS
- Safari peut suspendre une PWA en arrière-plan ou lorsque l'écran est verrouillé. Garder Safari ou la PWA ouverte pendant l'enregistrement.
- Le stockage local peut être supprimé par iOS ou par l'utilisateur. Exporter régulièrement les cours importants.
- La compatibilité MediaRecorder dépend de la version iOS.
- Cette branche est une version de développement ; la transcription doit être testée sur iPhone X avant publication sur la branche principale.

## Déploiement
GitHub Pages peut publier la racine du dépôt. Ouvrir l'URL HTTPS dans Safari, autoriser le microphone puis ajouter à l'écran d'accueil.
