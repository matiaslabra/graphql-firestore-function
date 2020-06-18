async function saveDocumentInAlgolia(snapshot, collectionIndex) {
  if (snapshot.exists) {
    const book = snapshot.data();
    if (book) {
      const algoObj = {
        objectID: snapshot.id,
        title: book.title,
        olCoverId: book.olCoverId,
        author: book.author,
      };

      await collectionIndex.saveObject(algoObj); // Adds or replaces a specific object.
    }
  }
}

async function updateDocumentInAlgolia(change, collectionIndex) {
  // const docBeforeChange = change.before.data();
  const docAfterChange = change.after.data();
  if (docAfterChange) {
    await saveDocumentInAlgolia(change.after, collectionIndex);
  }
}

async function deleteDocumentFromAlgolia(snapshot, collectionIndex) {
  if (snapshot.exists) {
    const objectID = snapshot.id;
    await collectionIndex.deleteObject(objectID);
  }
}

module.exports = {
  save: saveDocumentInAlgolia,
  update: updateDocumentInAlgolia,
  delete: deleteDocumentFromAlgolia,
};
