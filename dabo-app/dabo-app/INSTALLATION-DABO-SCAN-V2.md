# DABO Scan V2 — lecture intelligente

1. Décompresser le contenu de ce ZIP directement à la racine de `dabo-app` et accepter le remplacement des fichiers.
2. Aucun SQL et aucune variable d'environnement ne sont nécessaires.
3. Lancer : `npm run verify`
4. Ne pousser sur GitHub qu'après validation complète.

## Ce que fait V2
- OCR local dans le navigateur pour les images/photos via Tesseract.js chargé à la demande.
- Langues OCR : français + néerlandais + anglais.
- Extraction prudente : magasin/fournisseur, date, lignes/articles, prix et total quand détectables.
- Résultat éditable avant confirmation.
- Texte OCR brut consultable.
- Aucune écriture dans Courses/Promos/Budget dans cette étape.
- PDF : import accepté mais lecture directe annoncée comme prochaine brique.

## Confidentialité V2
L'image choisie est traitée dans le navigateur. La bibliothèque OCR et ses modèles linguistiques sont téléchargés à la demande depuis leurs CDN ; le code DABO de cette V2 n'envoie pas le fichier sélectionné à une API OCR DABO.
