const { Pool } = require('@neondatabase/serverless');

// Create a connection to your database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper function to display users
async function displayUsers() {
  try {
    const { rows } = await pool.query('SELECT id, username, email FROM users ORDER BY id');
    
    console.log('\n==== CellarMaster User List ====');
    console.log('ID | Username | Email');
    console.log('---------------------------');
    
    if (rows.length === 0) {
      console.log('No users found in the database.');
    } else {
      rows.forEach(user => {
        console.log(`${user.id} | ${user.username} | ${user.email}`);
      });
      console.log(`\nTotal Users: ${rows.length}`);
    }
  } catch (error) {
    console.error('Error displaying users:', error);
  }
}

// Helper function to find users by email (partial match)
async function findUsersByEmail(emailSearch) {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email FROM users WHERE email ILIKE $1 ORDER BY id',
      [`%${emailSearch}%`]
    );
    
    console.log(`\n==== Users matching "${emailSearch}" ====`);
    console.log('ID | Username | Email');
    console.log('---------------------------');
    
    if (rows.length === 0) {
      console.log('No matching users found.');
    } else {
      rows.forEach(user => {
        console.log(`${user.id} | ${user.username} | ${user.email}`);
      });
      console.log(`\nMatching Users: ${rows.length}`);
    }
  } catch (error) {
    console.error('Error finding users:', error);
  }
}

// Helper function to view user details including wine counts
async function viewUserDetails(userId) {
  try {
    // Get user basic info
    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`\nNo user found with ID ${userId}`);
      return;
    }
    
    const user = userResult.rows[0];
    
    // Get wine counts
    const wineCountResult = await pool.query(
      'SELECT COUNT(*) FROM wines WHERE user_id = $1',
      [userId]
    );
    
    // Get consumption counts
    const consumptionCountResult = await pool.query(
      'SELECT COUNT(*) FROM consumptions WHERE user_id = $1',
      [userId]
    );
    
    // Get wishlist counts
    const wishlistCountResult = await pool.query(
      'SELECT COUNT(*) FROM wishlist WHERE user_id = $1',
      [userId]
    );
    
    console.log(`\n==== User Details for ID: ${userId} ====`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Wines in collection: ${wineCountResult.rows[0].count}`);
    console.log(`Consumption records: ${consumptionCountResult.rows[0].count}`);
    console.log(`Wishlist items: ${wishlistCountResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error getting user details:', error);
  }
}

// Main function to process command-line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'list':
        await displayUsers();
        break;
      
      case 'find':
        if (!args[1]) {
          console.error('Please provide an email search term: node manage-users.js find example@gmail');
          process.exit(1);
        }
        await findUsersByEmail(args[1]);
        break;
      
      case 'details':
        if (!args[1] || isNaN(parseInt(args[1]))) {
          console.error('Please provide a valid user ID: node manage-users.js details 1');
          process.exit(1);
        }
        await viewUserDetails(parseInt(args[1]));
        break;
      
      default:
        console.log('CellarMaster User Management Tool');
        console.log('================================');
        console.log('Commands:');
        console.log('  list                    - List all users');
        console.log('  find [email]            - Find users by email (partial match)');
        console.log('  details [id]            - View detailed information about a user');
        console.log('\nExamples:');
        console.log('  node manage-users.js list');
        console.log('  node manage-users.js find gmail');
        console.log('  node manage-users.js details 1');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the main function
main();