// Shared by the visible pages, HTML renderer and sitemap. Claims describe shipped features.
export const SITE_ORIGIN = 'https://wordweftstudio.com';
export const SITE_NAME = 'WordWeft';
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-banner.jpg`;

export const landingPages = {
  '/read-online': {
    title: 'Read Stories & Novels Online | WordWeft',
    heading: 'Find your next story. Read it your way.',
    description: 'Read original stories and novels online on WordWeft. Browse genres, sample story openings, and enjoy adjustable reading themes and typography.',
    eyebrow: 'Read stories online', cta: 'Browse stories', href: '/category',
    intro: 'Discover fiction from independent writers, from a new serial to a finished story. Browse the library by genre, visit an author’s profile, or sample an opening in Hook Feed before choosing what to read.',
    sections: [
      ['Choose a story by genre', 'Explore fantasy, romance, mystery, science fiction, and other genres represented in the library. Each book page brings together its synopsis, tags, author, age rating, and published chapters so you can decide where to begin.'],
      ['Make room for a longer read', 'Adjust the reader’s font, text size, line spacing, width, and reading theme. Focus mode gives the text more space, and the chapter list helps you move through a story.'],
      ['Keep a place for the stories you love', 'With an account, save stories to your library, organize reading shelves, and keep reading progress. Follow writers and join conversations when you want to go beyond the page.'],
    ],
    steps: ['Open the library and choose a genre or search for a story.', 'Read the synopsis and check the rating and content notes.', 'Open a published chapter and adjust the reader to suit you.'],
    faqs: [
      ['Do I need an account to read?', 'You can browse publicly available stories and read their published chapters without signing in. Saving your library, following writers, and participating require an account. Some age-rated stories require an eligible account and mature-content preferences.'],
      ['Can I read on a phone?', 'The reader adapts to smaller screens and includes adjustable type and reading themes. WordWeft runs in your browser.'],
    ],
  },
  '/writing-tools': {
    title: 'Online Novel Writing Tools & Story Editor | WordWeft',
    heading: 'A writing studio for the story you want to tell.',
    description: 'Write novels and stories online with WordWeft’s chapter editor, character profiles, world-building notes, manuscript import, and publishing tools.',
    eyebrow: 'Online writing tools', cta: 'Open the writing studio', href: '/write',
    intro: 'Bring your chapters, cast, and story notes into one writing space. WordWeft connects the work of drafting fiction with the experience of sharing it with readers.',
    sections: [
      ['Draft one chapter at a time', 'Create a book and build its chapter list. Use the rich text editor for formatting, links, and images. Keep unfinished chapters as drafts while you work toward a release.'],
      ['Keep your story world close', 'Create character profiles and keep scene and lore notes beside your manuscript. Character mentions can bring a character card into the reading experience.'],
      ['Bring an existing manuscript', 'Import a supported manuscript from the writing studio, review the chapter structure, and edit it before publishing. Revision history helps you revisit saved versions of a chapter.'],
      ['Shape the reading experience', 'Use mood cues and spoiler formatting where they support your story. Preview your work and publish chapters immediately or schedule a future release.'],
    ],
    steps: ['Sign in and create a book with a title, synopsis, and genres.', 'Add chapters, character profiles, and the notes your story needs.', 'Review a chapter, then publish it or schedule its release.'],
    faqs: [
      ['Are drafts visible to readers?', 'Draft and scheduled chapters stay private until they are published. Public story pages show published chapters.'],
      ['Is WordWeft only for novels?', 'You can organize different kinds of writing, including novels, short stories, and poetry. Choose a category and relevant genres when setting up your book.'],
    ],
  },
  '/publish-stories': {
    title: 'Publish Stories & Serial Fiction Online | WordWeft',
    heading: 'Take your story from draft to readers.',
    description: 'Publish original stories and serial fiction online. Build a book page, release chapters, schedule updates, and connect with readers on WordWeft.',
    eyebrow: 'Publish fiction online', cta: 'Start your story', href: '/write/book/create',
    intro: 'Publish your writing chapter by chapter, with a public home for the story and a profile for its author. Readers can discover your work through the library, its genres, and your shared story link.',
    sections: [
      ['Give readers a reason to open chapter one', 'Add a clear title, a cover, and a synopsis that introduces the premise. Choose genres and tags that describe the work honestly, and include its age rating and relevant content warnings.'],
      ['Publish at your pace', 'Work in drafts, publish a chapter when it is ready, or schedule a release. Keep the story’s ongoing, completed, or hiatus status up to date so readers know what to expect.'],
      ['Build a connection around the writing', 'Readers can follow your author profile, leave reviews, and discuss chapters. Your writer analytics help you understand how readers engage with published work.'],
    ],
    steps: ['Create a book and complete its public details.', 'Write or import your manuscript and review each chapter.', 'Publish the book and ready chapters, then share the public book link.'],
    faqs: [
      ['Can I publish a serial before it is finished?', 'Yes. Keep the story marked ongoing and publish additional chapters as they are ready. Unpublished chapters remain drafts.'],
      ['Does publishing guarantee readers?', 'Publishing makes eligible stories available for discovery. A compelling synopsis, accurate genres, consistent releases, and thoughtful participation can help readers decide to try your work.'],
    ],
  },
  '/world-building-tools': {
    title: 'World-Building & Character Planning Tools | WordWeft',
    heading: 'Keep your characters and story world in reach.',
    description: 'Plan fictional characters, scenes, and lore beside your chapters. Explore WordWeft’s world-building tools for novel and story writers.',
    eyebrow: 'World-building tools for writers', cta: 'Build your story world', href: '/write',
    intro: 'A believable world grows from consistent details. Keep your cast, scene ideas, and lore with the book they belong to, so you can return to the writing without losing the thread.',
    sections: [
      ['Build a cast you can return to', 'Create character profiles with portraits, roles, and backstories. Use character mentions in your manuscript to make contextual character cards available to readers.'],
      ['Connect scenes to chapters', 'Organize scene details alongside your chapter work. Keep the setting and the purpose of a scene nearby as you draft and revise.'],
      ['Give the world its own notebook', 'Store lore and supporting notes in the world-building workspace. Capture the rules, places, and details you need for continuity instead of relying on memory.'],
    ],
    steps: ['Create a book in the writing studio.', 'Add the characters, scenes, and notes you need for the next chapter.', 'Keep those references close while you draft and revise.'],
    faqs: [
      ['Is world-building only useful for fantasy?', 'No. Character and setting notes can support romance, mystery, science fiction, historical fiction, and any story where continuity matters.'],
      ['Can readers see character information?', 'Character mentions can show character cards in the reader. Review the information you attach before publishing so you do not reveal a plot detail too early.'],
    ],
  },
};

export const staticPages = {
  '/': { title: 'Read Stories Online & Write Fiction | WordWeft', description: 'Discover original stories and novels on WordWeft. Read with immersive tools, write fiction, build characters and worlds, and publish chapters for readers.' },
  '/features': { title: 'Reading & Writing Platform Features | WordWeft', description: 'Explore WordWeft’s immersive reader, novel editor, character cards, world-building tools, spoiler formatting, and chapter publishing features.' },
  '/about': { title: 'About WordWeft Studio | Readers & Writers', description: 'Meet WordWeft Studio, a home for independent writers and curious readers, and learn about the ideas behind the platform.' },
  '/contact': { title: 'Contact WordWeft Studio', description: 'Contact the WordWeft team for platform support, questions, and feedback about reading and publishing stories.' },
  '/terms': { title: 'Terms of Service | WordWeft', description: 'Read the terms for using WordWeft as a reader, writer, or community member.' },
  '/privacy': { title: 'Privacy Policy | WordWeft', description: 'Learn how WordWeft collects, uses, and protects personal information.' },
  '/safety': { title: 'Community Safety & Content Rules | WordWeft', description: 'Read WordWeft’s content guidelines, age-rating rules, and community safety standards.' },
  ...landingPages,
};

export const discoveryLinks = Object.entries(landingPages).map(([href, page]) => ({ href, label: page.eyebrow }));
