# 9TH NOTE — PWA iPhone / Windows

## Contenu de cette première version
- Interface responsive sombre et dorée
- Enregistrement microphone via MediaRecorder
- Pause / reprise / arrêt
- Stockage local IndexedDB (audio + notes)
- Recherche et classement des cours
- Édition manuelle de la transcription
- Export TXT, JSON 9TH NOTE et audio via le menu de partage iOS
- Cache PWA pour ouvrir l'application hors connexion après la première visite

## Limite importante : transcription automatique
Cette version ne contient PAS encore le moteur Whisper. Elle enregistre les cours et permet de saisir/corriger une transcription. Pour ajouter une vraie transcription automatique hors ligne, il faut intégrer un build WebAssembly de whisper.cpp et un modèle multilingue compatible, puis tester mémoire, vitesse et formats audio sur iPhone X. Ne pas remplacer cette étape par Web Speech API : celle-ci n'est pas garantie hors ligne sur iOS.

## Installation sur Windows
1. Décompresser le dossier.
2. Installer Visual Studio Code (facultatif) et Python 3.
3. Ouvrir PowerShell dans le dossier `ninth_note_pwa`.
4. Lancer : `py -m http.server 8000`
5. Sur le PC, ouvrir `http://localhost:8000` pour vérifier l'interface.

## Tester sur iPhone
Le mode PWA, le microphone et l'installation exigent un contexte sécurisé (HTTPS), sauf localhost. Pour le premier test sur iPhone, héberger le dossier sur un hébergeur statique HTTPS (par exemple GitHub Pages) ou utiliser un tunnel HTTPS depuis le PC.
1. Ouvrir l'adresse HTTPS dans Safari.
2. Autoriser le microphone.
3. Tester un enregistrement court.
4. Menu Partager > Sur l'écran d'accueil.
5. Après le premier chargement, couper Internet et vérifier que l'interface s'ouvre.

## Partage
- « Partager le cours » envoie un fichier `.julnotes.json` avec les métadonnées et la transcription.
- « Partager l'audio » envoie l'enregistrement audio séparément.
- AirDrop apparaît dans la feuille de partage iOS si disponible.
- Pour l'instant, le destinataire reçoit des fichiers standards ; l'import direct du JSON dans la bibliothèque n'est pas encore implémenté.

## Limites iOS à connaître
- Safari peut suspendre une PWA en arrière-plan ou lorsque l'écran est verrouillé. Ne pas compter sur un enregistrement de plusieurs heures écran éteint.
- Le navigateur peut effacer des données locales si le stockage est sous pression ou si l'utilisateur supprime les données du site. Exporter régulièrement les cours importants.
- Les formats audio MediaRecorder varient selon la version d'iOS.
- Une PWA ne peut pas reproduire toutes les capacités d'une application native iOS.

## Prochaine étape de développement
1. Ajouter l'import de fichiers `.julnotes.json`.
2. Ajouter un export groupé audio + transcription.
3. Intégrer whisper.cpp WebAssembly et le modèle multilingue quantifié.
4. Tester la transcription en français sur iPhone X et mesurer mémoire, vitesse et autonomie.
5. Si les performances sont insuffisantes, proposer la transcription sur ordinateur Windows en local, puis transférer le cours sur iPhone.


## Utilisation depuis un iPhone uniquement
Le code peut être consulté et les fichiers peuvent être téléversés depuis Safari sur iPhone. Pour rendre la PWA installable, il faut toutefois la publier sur une adresse HTTPS.

Méthode possible :
1. Décompresser l'archive dans l'application Fichiers de l'iPhone.
2. Créer un dépôt GitHub depuis Safari.
3. Dans le dépôt, utiliser Add file > Upload files et sélectionner les fichiers du dossier (y compris le dossier `icons`).
4. Dans Settings > Pages, choisir le déploiement depuis la branche principale et le dossier racine.
5. Attendre l'adresse HTTPS publiée, l'ouvrir dans Safari puis Partager > Sur l'écran d'accueil.

Les intitulés peuvent légèrement varier selon la version du site GitHub. La publication exige un compte GitHub et une connexion Internet. Une fois la PWA chargée et mise en cache, son interface peut fonctionner hors ligne.

IMPORTANT : la transcription automatique Whisper n'est pas encore intégrée dans cette version. L'application permet déjà l'enregistrement local et la saisie/correction de notes. La capture en arrière-plan ou écran verrouillé n'est pas garantie par Safari iOS.
