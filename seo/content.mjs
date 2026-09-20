// Shared by the visible pages, HTML renderer and sitemap. Claims describe shipped features.
export const SITE_ORIGIN = 'https://www.wordweftstudio.com';
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
  '/wattpad-alternatives': {
    title: 'Wattpad Alternatives for Writers & Readers | WordWeft',
    heading: 'Looking for a Wattpad alternative? Start with what you need.',
    description: 'Compare what matters in a Wattpad alternative. See how WordWeft supports long-form fiction, chapter publishing, story planning, and reader-friendly discovery.',
    eyebrow: 'Wattpad alternative', cta: 'Explore WordWeft', href: '/features',
    intro: 'The best place for a story depends on how you write and how your readers want to find it. WordWeft is an independent option for writers who want to draft, organize, and publish original fiction in one browser-based studio—and for readers who want a focused place to discover it.',
    criteria: [
      ['Writing workflow', 'Look beyond a basic text box. Check whether the platform supports chapters, manuscript import, revision history, images, formatting, and private drafts.'],
      ['Story organization', 'For a novel or serial, character profiles, scene notes, and world-building references can matter as much as the public book page.'],
      ['Reader experience', 'Preview the chapter reader on a phone and a laptop. Typography, themes, navigation, content notes, and accessibility affect whether people stay with a long story.'],
      ['Publishing control', 'Confirm that you can keep chapters private, publish selected chapters, schedule releases, and clearly show whether a story is ongoing or complete.'],
    ],
    sections: [
      ['Write the book before promoting it', 'WordWeft keeps chapter drafting, manuscript import, story notes, characters, and publishing controls together. Draft and scheduled chapters remain private until you decide to release them.'],
      ['Build a public home for the story', 'Each published story has a cover, synopsis, genres, tags, age rating, content guidance, author link, and chapter list. Readers can understand the premise before opening chapter one.'],
      ['Give readers control of the page', 'The browser reader includes adjustable typography, width, line spacing, themes, and focus mode. Readers can save books, organize shelves, follow writers, and join discussions with an account.'],
      ['Choose WordWeft for the right reasons', 'WordWeft is a growing platform focused on the writing and reading experience. It does not promise an instant audience, a publishing contract, or guaranteed income. Paid publishing is not currently live.'],
    ],
    steps: ['Browse published stories and open a chapter on the device you use most.', 'Review the writing studio, manuscript import, and story-planning tools.', 'Create a book only if the workflow and reader experience fit your project.'],
    faqs: [
      ['Is WordWeft affiliated with Wattpad?', 'No. WordWeft is an independent reading and writing platform and is not affiliated with or endorsed by Wattpad. Wattpad is a trademark of its respective owner.'],
      ['Can I move an existing manuscript to WordWeft?', 'The writing studio supports manuscript import. Always review the imported chapter breaks, formatting, tables, and images before publishing.'],
      ['Can readers use WordWeft on a phone?', 'Yes. WordWeft runs in the browser and its public reading experience adapts to phone, tablet, and desktop screens.'],
      ['Does WordWeft pay writers?', 'Paid publishing is not currently live. WordWeft does not promise earnings, contracts, or a particular number of readers.'],
    ],
    related: ['/writing-tools', '/publish-stories', '/read-original-fiction-online'],
  },
  '/webnovel-alternatives': {
    title: 'Webnovel Alternatives for Serial Writers | WordWeft',
    heading: 'A Webnovel alternative for building a serial on your terms.',
    description: 'Compare Webnovel alternatives for writing and publishing serial fiction. Explore WordWeft chapters, scheduling, story planning, author pages, and reader tools.',
    eyebrow: 'Webnovel alternative', cta: 'See publishing tools', href: '/publish-stories',
    intro: 'A serial-fiction platform should make regular chapter releases manageable without making the manuscript feel secondary. WordWeft connects drafting, story planning, publishing, and a responsive reading experience for original fiction.',
    criteria: [
      ['Release workflow', 'Check whether you can keep future chapters private, publish only the chapters that are ready, and schedule an upcoming release.'],
      ['Rights and expectations', 'Read current platform terms yourself. Treat promises about contracts, earnings, exclusivity, or reach as separate from the quality of the writing tools.'],
      ['Long-form readability', 'Test chapter navigation, text width, type size, themes, and content guidance before asking readers to follow a long-running serial.'],
      ['Author presence', 'A useful author profile should connect the writer, their published books, and the next chapter a reader can open.'],
    ],
    sections: [
      ['Plan a serial chapter by chapter', 'Create a book, organize chapters, import an existing manuscript, and keep characters, scenes, and world notes near the draft. Revision history helps you revisit earlier saved versions.'],
      ['Release only what is ready', 'A book and its chapters have explicit publishing states. You can keep unfinished work in draft, release selected chapters, or schedule a chapter for later.'],
      ['Help the right readers find the story', 'Public story pages use the synopsis, genres, tags, age rating, content notes, author profile, and published chapter list to set clear expectations.'],
      ['Keep the choice honest', 'WordWeft currently focuses on writing, publishing, discovery, and reader connection. Paid publishing is not live, and using the platform does not guarantee a contract, income, or readership.'],
    ],
    steps: ['Read a published serial and test its chapter navigation.', 'Create a draft book and review the chapter and scheduling workflow.', 'Publish only after checking the story details and every selected chapter.'],
    faqs: [
      ['Is WordWeft affiliated with Webnovel?', 'No. WordWeft is independent and is not affiliated with or endorsed by Webnovel. Webnovel is a trademark of its respective owner.'],
      ['Can I schedule serial chapters?', 'Yes. A writer can schedule an eligible chapter for a future release while keeping other unfinished chapters in draft.'],
      ['Does WordWeft require an exclusive contract?', 'Creating and publishing a story on WordWeft does not itself make it an exclusive publishing contract. Read the current Terms of Service before publishing on any platform.'],
      ['Does WordWeft have coins or paid chapters?', 'Paid publishing is not currently live. The present experience focuses on reading, writing, publishing, and community features.'],
    ],
    related: ['/publish-stories', '/writing-tools', '/wattpad-alternatives'],
  },
  '/royal-road-alternatives': {
    title: 'Royal Road Alternatives for Fiction Writers | WordWeft',
    heading: 'Comparing Royal Road alternatives for your next serial?',
    description: 'Explore a Royal Road alternative for publishing fiction across genres, organizing story notes, scheduling chapters, and using an adjustable reader.',
    eyebrow: 'Royal Road alternative', cta: 'Browse original fiction', href: '/category',
    intro: 'Genre fit, writing workflow, and the reading experience all matter when choosing a home for serial fiction. WordWeft supports original stories across its active catalog genres and gives each project a connected writing studio and public book page.',
    criteria: [
      ['Genre and audience fit', 'Browse the current catalog rather than assuming every fiction community has the same readership. Your genre, tone, and release style should fit the readers already there.'],
      ['Feedback style', 'Decide whether you want reviews, chapter discussion, follows, and reader analytics—and how much feedback you want while a story is still in progress.'],
      ['Planning depth', 'Long serials benefit from character records, lore, scenes, content guidance, and reliable chapter ordering alongside the manuscript.'],
      ['Mobile reading', 'Many readers meet a serial on a phone. Test the actual chapter page, not only the publishing dashboard.'],
    ],
    sections: [
      ['Support more than the chapter list', 'WordWeft pairs chapter drafting with character profiles, scene planning, world-building notes, manuscript import, revision history, and image support.'],
      ['Publish across the genres you write', 'Writers choose the genres and tags that accurately describe a story. Readers can browse the real catalog rather than a fabricated list of empty SEO categories.'],
      ['Make a long serial comfortable to read', 'Readers can adjust typography, spacing, width, and themes, use focus mode, move through published chapters, and save stories to their library.'],
      ['Evaluate a growing platform realistically', 'WordWeft is still growing. A smaller catalog can make early participation meaningful, but it does not guarantee reach, rankings, reviews, or earnings.'],
    ],
    steps: ['Browse the genres that match your work and inspect several story pages.', 'Test the editor, planning tools, and reader on both phone and desktop.', 'Publish a complete story page and only the chapters you are ready to share.'],
    faqs: [
      ['Is WordWeft affiliated with Royal Road?', 'No. WordWeft is an independent platform and is not affiliated with or endorsed by Royal Road. Royal Road is a trademark of its respective owner.'],
      ['Is WordWeft only for fantasy or LitRPG?', 'No. Writers can publish across the categories and genres available in the WordWeft catalog, including but not limited to speculative fiction.'],
      ['Can I publish an ongoing story?', 'Yes. Mark the book as ongoing and release chapters as they are ready. Draft and scheduled chapters are not shown as published chapters.'],
      ['Can readers comment on chapters?', 'Signed-in readers can participate in chapter discussion and other community features available on the story.'],
    ],
    related: ['/publish-stories', '/read-original-fiction-online', '/world-building-tools'],
  },
  '/online-fiction-platform': {
    title: 'Online Fiction Writing & Publishing Platform | WordWeft',
    heading: 'Write, organize, and publish fiction in one place.',
    description: 'Use WordWeft to write and publish fiction online with chapter editing, manuscript import, story planning, scheduled releases, and a responsive reader.',
    eyebrow: 'Online fiction platform', cta: 'Start writing', href: '/write',
    intro: 'If you are deciding where to write and publish stories online, test the complete path from private draft to public chapter. WordWeft is designed to keep the manuscript, story world, book page, and reading experience connected.',
    criteria: [
      ['Before publishing', 'Check drafting, autosave, import, revision history, chapter order, images, tables, character notes, and what remains private.'],
      ['At publication', 'Check age ratings, content guidance, book and chapter status, scheduling, public previews, and the exact chapters included in a release.'],
      ['After publication', 'Check the public book page, author profile, reader navigation, library saving, reviews, comments, follows, and analytics.'],
      ['On every device', 'Run the whole flow on the smallest phone and the laptop you actually use. A feature list cannot replace a working interface.'],
    ],
    sections: [
      ['A chapter editor built for long work', 'Draft in rich text with headings, emphasis, quotations, lists, links, tables, dividers, and images. Keep the formatting toolbar in reach while working through a long chapter.'],
      ['Import without treating a manuscript as plain text', 'WordWeft can import a supported manuscript, detect chapter structure, retain supported formatting, and bring embedded images into the upload flow for review.'],
      ['Keep the cast and world beside the draft', 'Character profiles, scenes, lore, and story notes remain attached to the book so continuity work does not have to live in a separate pile of documents.'],
      ['Publish with explicit control', 'Choose which chapters are ready, keep the rest private, publish the book with selected chapters, or schedule an eligible chapter for later.'],
    ],
    steps: ['Create a private book and add its basic story details.', 'Write a chapter or import a supported manuscript, then review the result.', 'Preview the reader, choose the ready chapters, and publish or schedule them.'],
    faqs: [
      ['Can I use WordWeft as an online novel writing website?', 'Yes. WordWeft organizes a long work as a book with chapters, story details, characters, scenes, and world notes.'],
      ['Can I keep my story private while writing?', 'Yes. Draft books and chapters remain outside the public reading catalog until they are published.'],
      ['Does manuscript import replace proofreading?', 'No. Import reduces manual setup, but writers should review chapter boundaries, formatting, tables, and images before publishing.'],
      ['Can I publish short stories or poetry?', 'Yes. WordWeft supports multiple writing categories; choose the category and genres that accurately describe the work.'],
    ],
    related: ['/writing-tools', '/publish-stories', '/world-building-tools'],
  },
  '/read-original-fiction-online': {
    title: 'Read Original Fiction & Online Novels | WordWeft',
    heading: 'Read original fiction from independent writers.',
    description: 'Discover original fiction, online novels, and serial stories on WordWeft. Browse real genres, meet independent writers, and personalize the chapter reader.',
    eyebrow: 'Read original fiction', cta: 'Browse published stories', href: '/category',
    intro: 'WordWeft is a browser-based library of stories published by independent writers. Start with a genre, a story synopsis, an author, or an opening chapter—then adjust the page for the way you like to read.',
    criteria: [
      ['A clear premise', 'Story pages bring the synopsis, genres, tags, status, age rating, content guidance, author, and published chapter list together before you begin.'],
      ['A readable chapter', 'Change the typeface, text size, line spacing, reading width, and theme. Focus mode gives a long chapter more room.'],
      ['A visible writer', 'Open an author profile to learn about the writer and see the other stories they have published.'],
      ['A place to return', 'With an account, save books to library shelves, keep your reading place, follow writers, review books, and join chapter conversations.'],
    ],
    sections: [
      ['Browse the catalog that actually exists', 'Explore published books and the genres represented in the current WordWeft library. Genre and tag pages are built from eligible public stories, not placeholder lists.'],
      ['Try an opening before committing', 'Book pages show the published chapter list and lead into the opening chapter, with age information and content notes where the writer has provided them.'],
      ['Make the reader feel like your page', 'Use comfortable typography and spacing, switch between reading themes, narrow or widen the text, and reduce interface distractions with focus mode.'],
      ['Support a writer beyond the first chapter', 'Follow an author, leave a considered review, or join a chapter discussion when you have something useful to add.'],
    ],
    steps: ['Browse stories or choose a genre from the public catalog.', 'Read the synopsis, age rating, content notes, and published chapter list.', 'Open a chapter and adjust the reader before settling in.'],
    faqs: [
      ['Are the stories on WordWeft original?', 'WordWeft is built for writers to publish their own work. Writers remain responsible for having the rights to content they upload and for following the platform terms.'],
      ['Can I read WordWeft without installing an app?', 'Yes. WordWeft runs in a web browser on phone, tablet, and desktop.'],
      ['How do I find a particular genre?', 'Open the story catalog and choose a represented genre, or follow a genre link from a public book page.'],
      ['Do I need an account?', 'Publicly available story pages can be browsed without signing in. An account is required for saved library shelves, follows, discussions, and gated reading beyond public previews.'],
    ],
    related: ['/read-online', '/wattpad-alternatives', '/royal-road-alternatives'],
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
  '/founding-writers': { title: 'Apply to Be a Founding Writer | WordWeft', description: 'Become a WordWeft Founding Writer, publish your fiction, help shape the platform, and receive permanent recognition.' },
  ...landingPages,
};

export const discoveryLinks = Object.entries(landingPages).map(([href, page]) => ({ href, label: page.eyebrow }));
export const primaryDiscoveryLinks = discoveryLinks.filter(link => ['/read-online', '/writing-tools', '/publish-stories', '/world-building-tools'].includes(link.href));
