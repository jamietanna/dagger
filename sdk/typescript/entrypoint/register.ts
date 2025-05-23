import {
  dag,
  Function_,
  FunctionWithArgOpts,
  ModuleID,
  TypeDef,
  TypeDefKind,
} from "../api/client.gen"
import { scan } from "../introspector/scanner/scan.js"
import {
  ConstructorTypeDef,
  FunctionArg,
  FunctionTypedef,
  ListTypeDef,
  ObjectTypeDef,
  TypeDef as ScannerTypeDef,
} from "../introspector/scanner/typeDefs.js"

/**
 * Register the module files and returns its ID
 */
export async function register(files: string[]): Promise<ModuleID> {
  // Scan all files
  const scanResult = await scan(files)

  // Get the current module
  let mod = dag.currentModule()

  // For each class scanned, register its type, method and properties in the module.
  scanResult.classes.forEach((modClass) => {
    // Register the class Typedef object in Dagger
    let typeDef = dag.typeDef().withObject(modClass.name, {
      description: modClass.description,
    })

    // Register all functions (methods) to this object
    modClass.methods.forEach((method) => {
      typeDef = typeDef.withFunction(addFunction(method))
    })

    // Register all fields that belong to this object
    modClass.fields.forEach((field) => {
      typeDef = typeDef.withField(field.name, addTypeDef(field.typeDef), {
        description: field.description,
      })
    })

    if (modClass.constructor) {
      typeDef.withConstructor(addConstructor(modClass.constructor, typeDef))
    }

    // Add it to the module object
    mod = mod.withObject(typeDef)
  })

  // Call ID to actually execute the registration
  return await mod.id()
}

/**
 * Bind a constructor to the given object.
 */
function addConstructor(
  constructor: ConstructorTypeDef,
  owner: TypeDef
): Function_ {
  return dag.function_("", owner).with(addArg(constructor.args))
}

/**
 * Create a function in the Dagger API.
 */
function addFunction(fct: FunctionTypedef): Function_ {
  return dag
    .function_(fct.name, addTypeDef(fct.returnType))
    .withDescription(fct.description)
    .with(addArg(fct.args))
}

/**
 * Register all arguments in the function.
 */
function addArg(args: FunctionArg[]): (fct: Function_) => Function_ {
  return function (fct: Function_): Function_ {
    args.forEach((arg) => {
      const opts: FunctionWithArgOpts = {
        description: arg.description,
      }

      if (arg.defaultValue) {
        opts.defaultValue = arg.defaultValue as string & { __JSON: never }
      }

      let typeDef = addTypeDef(arg.typeDef)
      if (arg.optional) {
        typeDef = typeDef.withOptional(true)
      }

      fct = fct.withArg(arg.name, typeDef, opts)
    })

    return fct
  }
}

/**
 * Wrapper around TypeDef to return the right Dagger TypesDef with its options.
 *
 * This function only convert the Typedef into correct dagger call
 * but, it's up to function above with more context to add documentation,
 * define if it's an optional value or its default's.
 *
 * We cannot do it there because the Typedef can come from any source:
 * a field, a param, a return value etc...
 */
function addTypeDef(type: ScannerTypeDef<TypeDefKind>): TypeDef {
  switch (type.kind) {
    case TypeDefKind.ObjectKind:
      return dag.typeDef().withObject((type as ObjectTypeDef).name)
    case TypeDefKind.ListKind:
      return dag.typeDef().withListOf(addTypeDef((type as ListTypeDef).typeDef))
    case TypeDefKind.VoidKind:
      return dag.typeDef().withKind(type.kind).withOptional(true)
    default:
      return dag.typeDef().withKind(type.kind)
  }
}
