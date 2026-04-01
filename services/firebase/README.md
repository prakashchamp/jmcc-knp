# Firebase Firestore Module

A lightweight, type-safe Firebase Firestore integration for Next.js 16+ with React 19+. Provides custom hooks, a core operations layer, and optional Context-based caching.

## Features

- ✅ **Custom React Hooks** — `useDocument`, `useCollection`, `useFirestoreWrite`
- ✅ **Type-Safe** — Full TypeScript support with generics
- ✅ **Zero External Dependencies** — Uses only React and Firebase SDK
- ✅ **Flexible** — Works with Client Components, can extend to Server Actions
- ✅ **Batch Operations** — Atomic writes and transactions
- ✅ **Caching Layer** — Optional Context-based caching
- ✅ **Error Handling** — Built-in error states in hooks
- ✅ **Utilities** — Helpers for timestamps, validation, cloning

## Installation & Setup

### 1. Install Firebase SDK
Already added to `package.json`. Run:
```bash
npm install
```

### 2. Configure Environment Variables
Create or update `.env.local` with your Firebase project credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these from [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps → Web.

### 3. (Optional) Wrap App with Provider for Caching
In `app/layout.tsx` or at desired subtree:

```tsx
import { FirestoreProvider } from '@/services/firebase';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <FirestoreProvider>
          {children}
        </FirestoreProvider>
      </body>
    </html>
  );
}
```

This is **optional** — you can use the hooks without the provider.

## Usage

### Core Concepts

The module is organized in layers:
1. **Config** (`config.ts`) — Initializes Firebase app from env variables
2. **Database** (`db.ts`) — Exports Firestore instance
3. **Operations** (`operations.ts`) — Core CRUD functions
4. **Hooks** (`hooks.ts`) — React hooks wrapping operations
5. **Context** (`FirestoreProvider.tsx`) — Optional global caching

Use the **hooks** directly in components. The operations are mainly used internally or for server-side code.

---

## React Hooks API

### 1. `useDocument<T>` — Fetch Single Document

Fetches a single document and returns loading/error/data states.

```tsx
'use client';

import { useDocument } from '@/services/firebase';

interface User {
  name: string;
  email: string;
  createdAt: string;
}

export function UserProfile({ userId }: { userId: string }) {
  const { data: userDoc, loading, error } = useDocument<User>('users', userId);

  if (loading) return <p>Loading user...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!userDoc) return <p>User not found</p>;

  return (
    <div>
      <h1>{userDoc.data.name}</h1>
      <p>{userDoc.data.email}</p>
    </div>
  );
}
```

**Parameters:**
- `collectionName` — Firestore collection name (string)
- `docId` — Document ID (string or null to skip fetching)

**Returns:**
- `data` — `FirestoreDocument<T> | null` — Includes `id`, `data`, and `updatedAt`
- `loading` — boolean
- `error` — Error | null

**Note:** Pass `null` as docId to skip fetching.

---

### 2. `useCollection<T>` — Fetch Multiple Documents

Fetches a collection with optional query conditions.

```tsx
'use client';

import { useCollection, QueryCondition } from '@/services/firebase';

interface Post {
  title: string;
  author: string;
  published: boolean;
}

export function PublishedPosts() {
  const conditions: QueryCondition[] = [
    {
      field: 'published',
      operator: '==',
      value: true,
    },
  ];

  const { data: posts, loading, error } = useCollection<Post>('posts', conditions);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <h3>{post.data.title}</h3>
          <p>by {post.data.author}</p>
        </li>
      ))}
    </ul>
  );
}
```

**Query Operators:**
- `==` — Equals
- `<`, `<=`, `>`, `>=` — Comparison
- `!=` — Not equals
- `in` — Array includes
- `array-contains` — Array contains value
- `array-contains-any` — Array contains any of values

---

### 3. `useFirestoreWrite` — Write Data

Provides a function to create, update, delete, or batch-write documents.

```tsx
'use client';

import { useFirestoreWrite, BatchOperation } from '@/services/firebase';

export function CreatePost() {
  const { write, loading, error } = useFirestoreWrite();

  const handleSubmit = async (title: string) => {
    try {
      const result = await write({
        type: 'set',
        collection: 'posts',
        docId: 'my-first-post',
        data: {
          title,
          author: 'John',
          published: true,
        },
      });

      if (result.success) {
        console.log('Post created:', result.docId);
      }
    } catch (err) {
      console.error('Write failed:', err);
    }
  };

  if (error) return <p>Error: {error.message}</p>;

  return (
    <button onClick={() => handleSubmit('My Title')} disabled={loading}>
      {loading ? 'Creating...' : 'Create Post'}
    </button>
  );
}
```

**Operation Types:**
- `'set'` — Create or overwrite document
- `'update'` — Partial update (preserves other fields)
- `'delete'` — Remove document

**Batch Write Example:**

```tsx
const operations: BatchOperation[] = [
  {
    type: 'set',
    collection: 'users',
    docId: 'user1',
    data: { name: 'Alice' },
  },
  {
    type: 'update',
    collection: 'users',
    docId: 'user2',
    data: { lastLogin: new Date().toISOString() },
  },
  {
    type: 'delete',
    collection: 'users',
    docId: 'user3',
  },
];

const results = await write(operations);
```

---

### 4. `useDocumentMutate<T>` — Read + Write Single Document

Combines `useDocument` and write capability for convenient mutations.

```tsx
'use client';

import { useDocumentMutate } from '@/services/firebase';

interface Settings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

export function UserSettings({ userId }: { userId: string }) {
  const {
    data: docWithSettings,
    loading,
    error,
    mutate,
    mutating,
  } = useDocumentMutate<Settings>('users', userId);

  if (loading) return <p>Loading settings...</p>;

  const handleToggleTheme = async () => {
    const newTheme = docWithSettings?.data.theme === 'light' ? 'dark' : 'light';
    await mutate({ theme: newTheme });
  };

  return (
    <div>
      <button onClick={handleToggleTheme} disabled={mutating}>
        Current theme: {docWithSettings?.data.theme}
      </button>
    </div>
  );
}
```

---

### 5. `useCollectionMutate<T>` — Read + Write Collection

Combines `useCollection` and write methods (add, update, remove).

```tsx
'use client';

import { useCollectionMutate } from '@/services/firebase';

interface Todo {
  text: string;
  completed: boolean;
}

export function TodoList() {
  const {
    data: todos,
    loading,
    error,
    add,
    update,
    remove,
    mutating,
  } = useCollectionMutate<Todo>('todos');

  if (loading) return <p>Loading todos...</p>;

  const handleAddTodo = async () => {
    await add({ text: 'New todo', completed: false });
  };

  const handleComplete = async (todoId: string) => {
    await update(todoId, { completed: true });
  };

  const handleDelete = async (todoId: string) => {
    await remove(todoId);
  };

  return (
    <div>
      <button onClick={handleAddTodo} disabled={mutating}>
        Add Todo
      </button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span>{todo.data.text}</span>
            <button onClick={() => handleComplete(todo.id)}>Complete</button>
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Operations API

For server-side code or non-component contexts:

```tsx
import {
  getDocument,
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  batchWrite,
  runTransactionOperation,
} from '@/services/firebase';

// Single document
const userDoc = await getDocument('users', 'user1');
await setDocument('users', 'user1', { name: 'Alice' });
await updateDocument('users', 'user1', { age: 30 });
await deleteDocument('users', 'user1');

// Collection
const allUsers = await getCollection('users');
const filteredUsers = await getCollection('users', [
  { field: 'age', operator: '>', value: 18 },
]);

// Batch operations
await batchWrite([
  { type: 'set', collection: 'users', docId: 'u1', data: { name: 'Alice' } },
  { type: 'update', collection: 'users', docId: 'u2', data: { lastLogin: new Date().toISOString() } },
]);

// Transactions
const result = await runTransactionOperation(async (transaction) => {
  const doc = await transaction.get(doc(db, 'users', 'user1'));
  const newBalance = doc.data().balance + 100;
  transaction.update(doc.ref, { balance: newBalance });
  return newBalance;
});
```

---

## Context API (Optional Caching)

If using `FirestoreProvider`, access the cache:

```tsx
'use client';

import { useFirestoreContext } from '@/services/firebase';

export function MyComponent() {
  const { loadDocument, getCachedDocument, clearCache } = useFirestoreContext();

  // Load with automatic caching
  const user = await loadDocument('users', 'user1');

  // Get from cache without DB hit
  const cached = getCachedDocument('users', 'user1');

  // Clear all cache
  clearCache();

  return <div>{cached?.data.name}</div>;
}
```

---

## TypeScript Types

```tsx
import {
  FirestoreDocument,  // Single doc with id + data
  HookState,          // { data, loading, error }
  QueryCondition,     // { field, operator, value }
  BatchOperation,     // { type, collection, docId, data }
  WriteResult,        // { success, docId, error }
  UseFirestoreWriteReturn,  // { write, loading, error }
} from '@/services/firebase';
```

---

## Common Patterns

### Refetching Data

```tsx
const { data, loading, error } = useDocument('users', userId);

// Automatically refetches when userId changes
// To force refetch, change userId or create a custom hook
```

### Conditional Fetching

```tsx
const { data } = useDocument('settings', userId || null);
// Doesn't fetch if userId is null
```

### Error Boundary

```tsx
export function SafeUserProfile({ userId }: { userId: string }) {
  const { data, error, loading } = useDocument('users', userId);

  if (error) {
    return <ErrorBoundary error={error} />;
  }

  // ...
}
```

### Optimistic Updates

```tsx
const { data, mutate } = useDocumentMutate('posts', postId);

const handleLike = async () => {
  // Optimistically update local state
  setLocalLikes((prev) => prev + 1);

  try {
    await mutate({ likes: (data?.data.likes || 0) + 1 });
  } catch (err) {
    // Revert on error
    setLocalLikes((prev) => prev - 1);
  }
};
```

---

## Security Rules

⚠️ **Important:** Before production, set up Firestore security rules in Firebase Console.

Default (development only — **INSECURE**):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Example (authenticated users only):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth.uid == resource.data.authorId;
    }
  }
}
```

---

## Environment Configuration

All Firebase config is loaded from environment variables:
- Variables **MUST** start with `NEXT_PUBLIC_` to be accessible in browser
- Set them in `.env.local` (local dev) or CI/CD platform secrets (production)
- The module validates config on client-side initialization and logs warnings

---

## Future Enhancements

- Real-time listeners with `onSnapshot`
- Firebase Authentication integration
- Offline persistence
- Search functionality
- File upload helpers
- Analytics integration

---

## Troubleshooting

### "Firebase config is missing"
Check `.env.local` has all `NEXT_PUBLIC_FIREBASE_*` variables.

### "useFirestoreContext must be used within FirestoreProvider"
Wrap your component tree with `<FirestoreProvider>`.

### Type errors on document data
Ensure your generic type `T` matches your Firestore document structure.

### Document not found
`useDocument` returns `null` if document doesn't exist (not an error).

### Query returns empty
Check Firestore security rules allow reads.

---

## API Reference

See inline comments in:
- `hooks.ts` — React hooks
- `operations.ts` — Core operations
- `types.ts` — TypeScript interfaces
- `utils.ts` — Utility functions
