
1. **Install Dependencies**:
   ```bash
   cd scripts
   npm install
   ```

2. **Environment Variables** (optional):
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export API_BASE_URL="http://localhost:3005"
   ```
   
   If not set, the script will use local Supabase defaults.

## Usage

### Basic Usage
```bash
node import-shopify-taxonomy.js <path-to-taxonomy-file>

e.g

node import-shopify-taxonomy.js sample-taxonomy.json

```

## For auto ai transaltions run 
```bash
npm run bulk-translate
```

