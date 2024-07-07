import {Olmos, getSchema, Generated} from "./olmos";
import {sql} from "./db";
import { WhereIncompleted } from "./where";

interface PersonaSchema {
    nombre: string,
    cedula: string,
    cod_cargo: number,
    telefono: number,
    password: string,
    cod_zona: number
}

interface ZonaSchema {
    cod_zona: Generated<number>, 
    nombre: string,
}

interface CargoSchema {
    cod_cargo: number,
    id_depto: number,
    nombre: string,
}

interface DeptoSchema {
    id_depto: number,
    nombre: string,
    telefono: string
}

class Persona{
    static model = Olmos.new<PersonaSchema, "Personas">("Personas", sql);
    fields: PersonaSchema;

    constructor(req: PersonaSchema){
        this.fields = req;
    }

    static async getOne(cedula: PersonaSchema["cedula"]){
        const fields = await Persona.model.getOne({
            where: {
                cedula: new WhereIncompleted("cedula").equal(cedula)
            }
        });
        return new Persona(fields);
    }
    
    async save(){
        if (this.fields.cedula == undefined){
            await Persona.model.insert(this.fields);
        }else{
            await Persona.model.update(this.fields, {
                cedula: new WhereIncompleted("cedula").equal(this.fields.cedula)
            });
        }
    }
}

async function main(){
    let persona = new Persona({
        nombre: "juan",
        cedula: "2043491978",
        cod_cargo: 2,
        telefono: 12345,
        password: "test",
        cod_zona: 1
    });
    const cargo = Olmos.new<CargoSchema, "Cargos">("Cargos", sql);
    const depto = Olmos.new<DeptoSchema, "Departamentos">("Departamentos", sql);
    const zona  = Olmos.new<ZonaSchema, "Zonas">("Zonas", sql);
   
    //El cod de zona debería ser tomado de la tabla, eso estaría muy bueno
    const nuevaZona = zona.insert({
        "nombre": "holas"
        Zonas: {
            "nombre": hola
        }
    });

    const res2 = await Persona.model.getOne({
        where: {
            cedula: new WhereIncompleted("cedula").lessEqual("1234").or().equal("456"),
            nombre: new WhereIncompleted("nombre").in(["a", "b"])
        },
        fields: ["nombre", "telefono", "cedula"]}
    );
    
    const personasCargo = Persona.model.join("inner", cargo, {
        "Personas.cod_cargo": "Cargos.cod_cargo"
    }).insert({
        Personas: {
            nombre: 'hola'
        }
    });
    type PersonasCargoSchema = getSchema<typeof personasCargo>;
    
    const personasCargoDepto = personasCargo.join("inner", depto, {
        "Cargos.id_depto": "Departamentos.id_depto"
    });
    type PersonasCargoDeptoSchema = getSchema<typeof personasCargoDepto>;

    const idPersona = await Persona.model.insert({
        "cedula": "12345",
        "telefono": 12345,
        "nombre": "juan",
        "password": "anashe",
        "cod_zona": 1,
        "cod_cargo": 1,
    });

    const personas = Olmos.new<PersonaSchema, "Personas">("Personas", sql);
    personas.
        select(["nombre", "cedula", "id_depto"]).
        where("cedula").in([]).
            and("nombre").notNull()
        orderBy("cedula")

    const res = await personasCargoDepto.getAll({
        where: {
            cedula: new WhereIncompleted("cedula").in(['2043491978', '348213902', '348213901'])
        },
        fields: ["cedula", "Personas.nombre", "Cargos.cod_cargo", "Departamentos.telefono"]
    });
    console.log(res);

    await persona.save();

    persona = await Persona.getOne("12345");
    persona.fields.nombre = "jose";
    await persona.save();
}

main().then(() => {
    console.log("terminado");
});
