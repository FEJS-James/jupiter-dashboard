import { db } from './src/lib/db'
import { preferenceCategories } from './src/lib/schema'
import { PREFERENCE_CATEGORIES } from './src/types'

async function seedPreferenceCategories() {
  console.log('Seeding preference categories...')
  
  // Insert preference categories
  for (const category of PREFERENCE_CATEGORIES) {
    try {
      await db.insert(preferenceCategories).values({
        name: category.name,
        displayName: category.displayName,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      })
      console.log(`✓ Added category: ${category.displayName}`)
    } catch (error) {
      // Category might already exist
      console.log(`- Category already exists: ${category.displayName}`)
    }
  }
  
  console.log('✅ Preference categories seeding complete!')
}

// Run the seed function
seedPreferenceCategories()
  .catch((error) => {
    console.error('Error seeding preference categories:', error)
    process.exit(1)
  })