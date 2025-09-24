import { SchemaImporter } from "schemaimporter"


const arrayOfSchemas = await SchemaImporter.loadFromFolder({
	excludeSchemasWithImports: true,
	excludeSchemasWithRequiredServerParams: true,
	addAdditionalMetaData: false,
});

// cons
const absolutePaths = arrayOfSchemas
    .map( ( { absolutePath } ) => absolutePath )



console.log( '>>>', absolutePaths )


await import( absolutePaths[0] )