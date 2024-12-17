# Planity Backend

## Technologies utilisées

La partie backend utilise NestJS, Multer, Archiver pour la création de Zip

Toute la mécanique se fait sans bibliothèque tierce.

## Fonctionnement

### Importation

1. On regarde si le fichier CSV a déjà été importé, si c'est déjà le cas, on renvoie une erreur
2. On crée un chunk pour chaque morceau du fichier
3. Quand l'interface avertie qu'elle envoie le dernier bout du fichier on merge tous les chunk en un fichier
4. On lit le fichier obtenue ligne par ligne, on enregistre la ligne des titres, on identifie le séparateur, puis on copie chaque ligne soit dans un fichier **male** soit dans un fichier **female** suivant le genre

### Téléchargement

1. À partir du nom du fichier passé en paramètre de l'appel à l'API, on va chercher les fichiers **male** et **female** correspondants
2. On les compresse en une archive
3. On la renvoie

Voir le **Readme** du projet frontend pour en savoir plus sur le fonctionnement de l'interface

### Temps de développement

Une journée puis une autre pour les tests