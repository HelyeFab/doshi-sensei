const admin = require('firebase-admin');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Path to your service account key
const serviceAccount = require(path.resolve(__dirname, '../firebase-service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function addTestData() {
    // Timestamps
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)); // 60 days from now

    // Test Article
    const articleData = {
        title: 'Test Article',
        content: 'This is a test article for system validation.',
        summary: 'Test summary.',
        difficulty: 'N5',
        category: 'news',
        tags: ['test', 'news'],
        estimatedReadingTime: 3,
        vocabulary: [],
        kanji: [],
        publishDate: now,
        scrapedAt: now,
        expiresAt: expiresAt,
        viewCount: 0,
        bookmarkedBy: [],
        isArchived: false,
        source: {
            id: 'test-source',
            name: 'Test Source',
        },
    };

    // Test Story
    const storyData = {
        title: 'Test Story',
        titleJa: 'テストストーリー',
        description: 'A test story for system validation.',
        jlptLevel: 'N5',
        theme: 'test',
        tags: ['test', 'story'],
        pages: [],
        quiz: [],
        coverImageUrl: '',
        slug: 'test-story-123',
        publishedAt: now,
    };

    // Add or update article
    await db.collection('articles').doc('test-article-123').set(articleData, { merge: true });
    console.log('✅ Test article added/updated.');

    // Add or update story
    await db.collection('stories').doc('test-story-123').set(storyData, { merge: true });
    console.log('✅ Test story added/updated.');
}

async function migrateArticleBookmarks() {
    const bookmarksRef = db.collection('user_bookmarks');
    const snapshot = await bookmarksRef.where('contentType', '==', 'article').get();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        // If contentId is missing or not equal to doc.id, update it
        if (!data.contentId || data.contentId !== data.articleId && data.articleId) {
            const newContentId = data.articleId || doc.id;
            await doc.ref.update({ contentId: newContentId });
            updatedCount++;
            console.log(`Updated bookmark ${doc.id}: set contentId to ${newContentId}`);
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} bookmarks.`);
}

addTestData()
    .then(() => {
        console.log('✅ All test data added successfully!');
        migrateArticleBookmarks().then(() => {
            console.log('✅ Article bookmarks migrated successfully!');
            process.exit(0);
        });
    })
    .catch((err) => {
        console.error('❌ Error adding test data:', err);
        process.exit(1);
    });
