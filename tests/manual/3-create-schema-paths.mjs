import { SchemaImporter } from "schemaimporter"
import { dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'


const arrayOfSchemas = await SchemaImporter.loadFromFolder({
	excludeSchemasWithImports: true,
	excludeSchemasWithRequiredServerParams: true,
	addAdditionalMetaData: false,
});

const absolutePaths = arrayOfSchemas
    .map( ( { absolutePath } ) => absolutePath )

// Get current directory and target src directory
const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )
const srcDir = __dirname.replace( '/tests/manual', '/src' )

// Transform absolute paths to relative paths from src directory
const relativePaths = absolutePaths
    .map( ( absolutePath ) => relative( srcDir, absolutePath ) )

// Create .mjs file content
const mjsContent = `// Auto-generated schema paths for Cloudflare Workers compatibility
// Relative paths from ./src/ folder to schema modules

export const arrayOfSchemaPaths = [
${relativePaths.map( path => `    '${path}'` ).join( ',\n' )}
]`

// Write to src/schema-paths.mjs
const outputPath = srcDir + '/schema-paths.mjs'
writeFileSync( outputPath, mjsContent )

console.log( `Schema paths file created at: ${outputPath}` )
console.log( `Found ${relativePaths.length} schema files` )