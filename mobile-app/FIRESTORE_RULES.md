# Mobile app notes and Firebase rules suggestions

Firestore structure used by the app (suggested):

- households/{houseId}
  - createdAt, createdBy
  - months/{monthId}
    - parentA, parentB, splitA, splitB
    - expenses: array of expense objects { id, paidBy, amount, description, kids }

Security rules (example - adapt before production):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{houseId} {
      allow read: if resource.data?.public == true;
      allow write: if request.auth != null && (request.auth.uid == resource.data.createdBy || request.auth.uid in resource.data.sharedUsers);

      match /months/{monthId} {
        allow read, write: if request.auth != null && (exists(/databases/$(database)/documents/households/$(houseId)) && (request.auth.uid == get(/databases/$(database)/documents/households/$(houseId)).data.createdBy || request.auth.uid in get(/databases/$(database)/documents/households/$(houseId)).data.sharedUsers));
      }
    }
  }
}
