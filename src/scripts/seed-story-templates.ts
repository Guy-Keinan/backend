import 'dotenv/config';
import { StoryTemplateService } from '../services/storyTemplate.service';
import { connectDatabase, disconnectDatabase } from '../config/prisma';

/**
 * סקריפט להוספת תבניות סיפורים דוגמה
 */

const sampleTemplates = [
    {
        title: "הילד שלא רצה לישון",
        description: "סיפור על ילד שמתקשה להירדם ולומד על חשיבות השינה",
        category: "שינה",
        ageGroup: "3-6",
        maleVersion: `היה פעם ילד בשם {CHILD_NAME} שהיה בן {AGE}. כל ערב, כששעת השינה הגיעה, {CHILD_NAME} הסתתר מתחת למיטה ואמר: "אני לא עייף!" 

אמא של {CHILD_NAME} ניסתה להסביר לו שהשינה חשובה, אבל הוא פשוט לא רצה לשמוע. 

לילה אחד, כש{CHILD_NAME} התעורר באמצע הלילה, הוא ראה את הירח המחייך מבעד לחלון. הירח אמר לו: "שלום {CHILD_NAME}! אני רואה שאתה ער. אבל תדע לך שכשאתה ישן, הגוף שלך גדל וחזק!"

{CHILD_NAME} הבין שהירח צודק. מאז אותו לילה, כל ערב הוא הלך לישון בשמחה וחלם חלומות יפים.`,

        femaleVersion: `הייתה פעם ילדה בשם {CHILD_NAME} שהייתה בת {AGE}. כל ערב, כששעת השינה הגיעה, {CHILD_NAME} הסתתרה מתחת למיטה ואמרה: "אני לא עייפה!" 

אמא של {CHILD_NAME} ניסתה להסביר לה שהשינה חשובה, אבל היא פשוט לא רצתה לשמוע. 

לילה אחד, כש{CHILD_NAME} התעוררה באמצע הלילה, היא ראתה את הירח המחייך מבעד לחלון. הירח אמר לה: "שלום {CHILD_NAME}! אני רואה שאת ערה. אבל תדעי לך שכשאת ישנה, הגוף שלך גדל וחזק!"

{CHILD_NAME} הבינה שהירח צודק. מאז אותו לילה, כל ערב היא הלכה לישון בשמחה וחלמה חלומות יפים.`,

        placeholders: ["CHILD_NAME", "AGE"]
    },

    {
        title: "הילד הקטן והמפלצת הדמיונית",
        description: "סיפור על ילד שמתגבר על הפחד מהמפלצת שמתחת למיטה",
        category: "פחדים",
        ageGroup: "4-7",
        maleVersion: `{CHILD_NAME} היה ילד אמיץ בן {AGE}, אבל הוא היה מפחד ממפלצת שחשב שגרה מתחת למיטה שלו. כל לילה הוא שמע רשרושים מוזרים.

לילה אחד, {CHILD_NAME} החליט להיות אמיץ ולהסתכל מתחת למיטה. למרבה הפתעתו, הוא מצא שם... גורי חתולים קטנים ופרוותיים!

"סליחה שהפחדתי אותך," מיילל אחד הגורים. "אנחנו פשוט מחפשים בית חם."

{CHILD_NAME} שמח מאוד. מאותו לילה, הוא כבר לא פחד. הוא אפילו הכין להם מיטה קטנה ופינת אוכל.`,

        femaleVersion: `{CHILD_NAME} הייתה ילדה אמיצה בת {AGE}, אבל היא הייתה מפחדת ממפלצת שחשבה שגרה מתחת למיטה שלה. כל לילה היא שמעה רשרושים מוזרים.

לילה אחד, {CHILD_NAME} החליטה להיות אמיצה ולהסתכל מתחת למיטה. למרבה הפתעתה, היא מצאה שם... גורי חתולים קטנים ופרוותיים!

"סליחה שהפחדנו אותך," מיילל אחד הגורים. "אנחנו פשוט מחפשים בית חם."

{CHILD_NAME} שמחה מאוד. מאותו לילה, היא כבר לא פחדה. היא אפילו הכינה להם מיטה קטנה ופינת אוכל.`,

        placeholders: ["CHILD_NAME", "AGE"]
    },

    {
        title: "היום הראשון בגן",
        description: "סיפור על ילד שמתרגש מהיום הראשון בגן החדש",
        category: "חברות",
        ageGroup: "3-5",
        maleVersion: `{CHILD_NAME} התרגש מאוד. היום הוא הולך לגן החדש! הוא בן {AGE} וזו הפעם הראשונה שהוא יפגש כל כך הרבה ילדים.

כשהוא הגיע לגן, {CHILD_NAME} קצת התבייש. היו שם הרבה ילדים שהוא לא הכיר. אבל המטפלת הייתה נחמדה מאוד וקראה לו: "בוא {CHILD_NAME}, תכיר את החברים שלך!"

במהלך היום, {CHILD_NAME} שיחק עם קוביות, צייר ציור יפה, ואפילו מצא חבר טוב בשם דני. בסוף היום הוא אמר לאמא: "זה היה הכי כיף בעולם!"`,

        femaleVersion: `{CHILD_NAME} התרגשה מאוד. היום היא הולכת לגן החדש! היא בת {AGE} וזו הפעם הראשונה שהיא תפגש כל כך הרבה ילדים.

כשהיא הגיעה לגן, {CHILD_NAME} קצת התביישה. היו שם הרבה ילדים שהיא לא הכירה. אבל המטפלת הייתה נחמדה מאוד וקראה לה: "בואי {CHILD_NAME}, תכירי את החברים שלך!"

במהלך היום, {CHILD_NAME} שיחקה עם קוביות, ציירה ציור יפה, ואפילו מצאה חברה טובה בשם מיכל. בסוף היום היא אמרה לאמא: "זה היה הכי כיף בעולם!"`,

        placeholders: ["CHILD_NAME", "AGE"]
    }
];

const seedStoryTemplates = async (): Promise<void> => {
    await connectDatabase();

    try {
        console.log('🌱 Seeding story templates...\n');

        for (let i = 0; i < sampleTemplates.length; i++) {
            const template = sampleTemplates[i];
            if (template) { // בדיקת null safety
                console.log(`${i + 1}️⃣ Creating template: "${template.title}"`);

                const createdTemplate = await StoryTemplateService.createTemplate(template);
                console.log(`✅ Template created with ID: ${createdTemplate.id}`);
            }
        }

        console.log('\n📊 Getting templates statistics...');
        const stats = await StoryTemplateService.getTemplatesStats();
        console.log('✅ Statistics:', stats);

        console.log('\n🎉 Story templates seeded successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await disconnectDatabase();
    }
};

// הפעלת הזריעה
seedStoryTemplates();