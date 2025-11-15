import type { Book, Author, Review, Chapter, User, LibraryBook, Shelf } from './types';

export const mainAuthor: Author = {
  id: 1,
  name: 'Elara Vance',
  avatarUrl: 'https://picsum.photos/seed/author1/100/100',
  bio: 'Elara Vance is a celebrated author of speculative fiction, known for weaving intricate worlds and compelling characters. With a background in mythology and history, her stories often explore the boundaries between the known and the unknown.'
};

export const otherAuthors: Author[] = [
  { id: 2, name: 'Jaxson Reed', avatarUrl: 'https://picsum.photos/seed/author2/100/100', bio: 'Jaxson Reed writes thrilling sci-fi adventures.' },
  { id: 3, name: 'Seraphina Chen', avatarUrl: 'https://picsum.photos/seed/author3/100/100', bio: 'Seraphina Chen is a master of urban fantasy.' },
  { id: 4, name: 'Kaelen Moriarty', avatarUrl: 'https://picsum.photos/seed/author4/100/100', bio: 'Kaelen Moriarty pens dark, atmospheric mysteries.' },
];

const sampleReviews: Review[] = [
  { id: 1, user: { name: 'Alex', avatarUrl: 'https://picsum.photos/seed/user1/50/50' }, rating: 5, comment: 'An absolute masterpiece! The world-building is second to none.', sentiment: 'positive' },
  { id: 2, user: { name: 'Brianna', avatarUrl: 'https://picsum.photos/seed/user2/50/50' }, rating: 4, comment: 'A great read, though the ending felt a bit rushed. Still highly recommend!', sentiment: 'positive' },
  { id: 3, user: { name: 'Carlos', avatarUrl: 'https://picsum.photos/seed/user3/50/50' }, rating: 3, comment: 'It was okay. The main character was a bit bland for my taste.', sentiment: 'neutral' },
];

const sampleChapters: Chapter[] = [
  { id: 1, title: 'The Whispering Archives', wordCount: 3200, content: 'The air in the Grand Archives of Aerthos was thick with the scent of aged parchment and forgotten magic...', isReleased: true },
  { id: 2, title: 'Shadows in the Sundial', wordCount: 4100, content: 'Following the cryptic map, Kaelen found himself before the ancient Sundial of Omens, its shadow stretching like a skeletal finger...', isReleased: true },
  { id: 3, title: 'The Crimson Compass', wordCount: 3800, content: 'The compass, a relic of a fallen empire, pulsed with a faint crimson light, pulling him northward...', isReleased: true },
  { id: 4, title: 'A Prophecy Unfurled', wordCount: 4500, content: 'In the heart of the Crystal Caves, the prophecy unfurled not on a scroll, but in the shimmering facets of the stones themselves.', isReleased: false },
];


export const sampleBooks: Book[] = [
  {
    id: 1,
    title: 'The Obsidian Heart',
    author: mainAuthor,
    coverUrl: 'https://picsum.photos/seed/book1/400/600',
    rating: 4.8,
    reviewsCount: 1256,
    genres: ['High Fantasy', 'Adventure'],
    tags: ['Magic', 'Dragons', 'Quest'],
    summary: 'In a world where magic is fading, a young scribe discovers an ancient artifact that could either save her world or shatter it into oblivion. Her journey through forgotten kingdoms and treacherous landscapes will test her courage and redefine her destiny.',
    chapters: sampleChapters,
    status: 'Ongoing',
  },
  {
    id: 2,
    title: 'Echoes of a Neon City',
    author: otherAuthors[0],
    coverUrl: 'https://picsum.photos/seed/book2/400/600',
    rating: 4.5,
    reviewsCount: 892,
    genres: ['Cyberpunk', 'Sci-Fi'],
    tags: ['Dystopian', 'AI', 'Noir'],
    summary: 'In the rain-slicked streets of Neo-Kyoto, a down-on-his-luck detective takes on a case that plunges him into a conspiracy involving rogue AIs, megacorporations, and the digital ghosts of the past.',
    chapters: sampleChapters.slice(0, 2),
    status: 'Completed',
  },
  {
    id: 3,
    title: 'The Serpent and the Star',
    author: otherAuthors[1],
    coverUrl: 'https://picsum.photos/seed/book3/400/600',
    rating: 4.7,
    reviewsCount: 982,
    genres: ['Urban Fantasy', 'Mythology'],
    tags: ['Gods', 'Magic', 'Modern'],
    summary: 'Ancient gods walk the modern world in disguise. When a mortal woman accidentally binds herself to a trickster deity, she is thrust into a hidden war that threatens the very fabric of reality.',
    chapters: sampleChapters.slice(0, 3),
    status: 'Ongoing',
  },
  {
    id: 4,
    title: 'Whispers in the Fen',
    author: otherAuthors[2],
    coverUrl: 'https://picsum.photos/seed/book4/400/600',
    rating: 4.3,
    reviewsCount: 654,
    genres: ['Mystery', 'Thriller'],
    tags: ['Gothic', 'Supernatural', 'Investigation'],
    summary: 'A detective with a troubled past is called to a remote, fog-shrouded town to investigate a series of impossible murders. The deeper he digs, the more he realizes the town itself is the real monster.',
    chapters: sampleChapters.slice(0, 1),
    status: 'Completed',
  },
  {
    id: 5,
    title: 'The Sundered Crown',
    author: mainAuthor,
    coverUrl: 'https://picsum.photos/seed/book5/400/600',
    rating: 4.9,
    reviewsCount: 2301,
    genres: ['High Fantasy', 'Epic'],
    tags: ['War', 'Royalty', 'Betrayal'],
    summary: 'The sequel to The Obsidian Heart. The kingdom is on the brink of civil war, and the Sundered Crown, a symbol of unity, has been shattered. New alliances must be forged in the fire of rebellion to restore peace.',
    chapters: sampleChapters,
    status: 'Ongoing',
  },
  {
    id: 6,
    title: 'Gears of Retribution',
    author: otherAuthors[0],
    coverUrl: 'https://picsum.photos/seed/book6/400/600',
    rating: 4.6,
    reviewsCount: 1104,
    genres: ['Steampunk', 'Adventure'],
    tags: ['Inventions', 'Airships', 'Revenge'],
    summary: 'A brilliant inventor, left for dead after a catastrophic betrayal, rebuilds herself with clockwork and steam. She now pilots her magnificent airship on a quest for retribution against the powerful guild that wronged her.',
    chapters: sampleChapters.slice(0, 2),
    status: 'Completed',
  }
];

export const genres = [
  'High Fantasy',
  'Cyberpunk',
  'Urban Fantasy',
  'Mystery',
  'Steampunk',
  'Sci-Fi',
  'Adventure',
  'Thriller',
  'Epic',
  'Mythology'
];

// --- New mock data for User Profile ---

export const libraryBooks: LibraryBook[] = [
  {
    ...sampleBooks[0], // The Obsidian Heart
    progress: 35,
    addedDate: '2023-10-15',
  },
  {
    ...sampleBooks[2], // The Serpent and the Star
    progress: 80,
    addedDate: '2023-09-01',
  },
  {
    ...sampleBooks[1], // Echoes of a Neon City
    progress: 100,
    addedDate: '2023-08-20',
  },
  {
    ...sampleBooks[3], // Whispers in the Fen
    progress: 0,
    addedDate: '2023-11-01',
  },
  {
    ...sampleBooks[5], // Gears of Retribution
    progress: 100,
    addedDate: '2023-06-10',
  }
];

export const sampleShelves: Shelf[] = [
  {
    id: 1,
    name: 'Reading',
    books: libraryBooks.filter(b => b.progress > 0 && b.progress < 100),
  },
  {
    id: 2,
    name: 'To Read',
    books: libraryBooks.filter(b => b.progress === 0),
  },
  {
    id: 3,
    name: 'Completed',
    books: libraryBooks.filter(b => b.progress === 100),
  },
];


export const sampleUser: User = {
  id: 101,
  name: 'Jane Doe',
  avatarUrl: 'https://picsum.photos/seed/user101/200/200',
  joinDate: '2023-05-21',
  stats: {
    booksRead: 12,
    chaptersRead: 148,
    favoriteGenres: ['High Fantasy', 'Cyberpunk', 'Mystery'],
  },
  following: [mainAuthor, otherAuthors[0]],
  library: sampleShelves,
};