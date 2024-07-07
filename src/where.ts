const comparation = {
    eq: "=",
    ls: "<",
    gt: ">",
    le: "<=",
    ge: ">="
} as const;
type Comparation = typeof comparation[keyof typeof comparation];

export class WhereCompleted<Schema extends Record<string, any>>{
    query: string;
    args: any[];

    constructor(query: string, args: any[]){
        this.query = query;
        this.args = args;
    }

    and<const Field extends keyof Schema>(field: Field){
        const w = new WhereIncompleted<Schema, Field>(field, this.query, this.args);
        w.query += " AND ";
        return w;
    }

    or<const Field extends keyof Schema>(field: Field){
        const w = new WhereIncompleted<Schema, Field>(field, this.query, this.args);
        w.query += " OR ";
        return w;
    }
}

export class WhereIncompleted<Schema extends Record<string, any>, Field extends keyof Schema, FieldType=Schema[Field]>{
    query: string;
    private fieldName: string;
    private args: FieldType[];
    
    constructor(fieldName: Field, query: string, args: Schema[Field][] = []){
        this.fieldName = fieldName as string;
        this.query = query;
        this.args = args;
    }

    private newWhereCompleted(){
        return new WhereCompleted<Schema>(this.query, this.args);
    }

    in(values: Schema[Field][]){
        const parseValues = values.map(_ => "?").join(", ");
        this.query += `(${this.fieldName}) IN (${parseValues})`;
        this.args.push(...values);
        return this.newWhereCompleted();
    }

    isNull(){
        this.query += `${this.fieldName} IS NULL`;
        return this.newWhereCompleted();
    }

    isNotNull(){
        this.query += `${this.fieldName} IS NOT NULL`;
        return this.newWhereCompleted();
    }

    private compare(value: FieldType, type: Comparation){
        this.query += `${this.fieldName} ${type} ?`;
        this.args.push(value);

        return this.newWhereCompleted();
    }
    
    lessEqual(value: FieldType){
        return this.compare(value, comparation.le);
    }

    greaterEqual(value: FieldType){
        return this.compare(value, comparation.ge);
    }

    equal(value: FieldType){
        return this.compare(value, comparation.eq);
    }

    less(value: FieldType){
        return this.compare(value, comparation.ls);
    }

    greater(value: FieldType){
        return this.compare(value, comparation.gt);
    }
}
