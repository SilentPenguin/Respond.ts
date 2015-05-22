module Respond {

    /*----------------*
     *   Decorators   *
     *----------------*/
    function MessengerDecorator(): IMessengerDecorator {
        return <T extends Function>(target: Object, key: string, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> => {
            descriptor = { get: MessengerConstructor(key, descriptor.value) };
            return descriptor;
        };
    }

    function MessengerConstructor<T extends Function>(key: string, func: T): any {
        return function (): IMessenger<any, any> {
            var value = function (...rest: any[]) {
                this[key].value = func.apply(this, rest);
                this[key].targets.forEach(item => item.receive(this[key].value, this[key]));
                return this[key].value;
            }.bind(this);

            Object.defineProperty(this, key, { value: value });

            this[key].targets = this[key].targets || [];
            this[key].sources = this[key].sources || [];

            return this[key];
        }
    }

    function SenderDecorator(): ISenderDecorator {
        return <T extends Function>(target: Object, key: string, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> => {
            descriptor = { get: SenderConstructor(key, descriptor.value) };
            return descriptor;
        };
    }

    function SenderConstructor<T extends Function>(key: string, func: T): any {
        return function (): ISender<T> {
            var value = function (...rest: any[]) {
                this[key].value = func.apply(this, rest);
                this[key].targets.forEach(item => item.receive(this[key].value, this[key]));
                return this[key].value;
            }.bind(this);

            Object.defineProperty(this, key, { value: value });

            this[key].targets = this[key].targets || [];

            return this[key];
        }
    }

    function ReceiverDecorator(): IReceiverDecorator {
        return <T extends Function>(target: Object, key: string, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> => {
            descriptor = { get: ReceiverConstructor(key, descriptor.value) };
            return descriptor;
        };
    }

    function ReceiverConstructor<T extends Function>(key: string, func: T): any {
        return function (): IReceiver<T> {
            Object.defineProperty(this, key, { value: func.bind(this) });

            this[key].sources = this[key].sources || [];
            this[key].receive = this[key];

            return this[key];
        }
    }

    export var messenger: IMessengerDecorator = MessengerDecorator();
    export var sender: ISenderDecorator = SenderDecorator();
    export var receiver: IReceiverDecorator = ReceiverDecorator();

    /*----------------*
     * Implementation *
     *----------------*/

    export var to = {
        sender: <T>(sender: ISender<T>): IQuery<T> => {
            return new Query(sender);
        }
    }

    class Query<T> implements IQuery<T> {
        stream: ISenderStream<T>;

        constructor(stream: ISenderStream<T>) {
            this.stream = stream;
        }

        as: IAs<T> = As.call(this);
        flatten: IFlatten<T> = Flatten.call(this);
        mix: IMix<T> = Mix.call(this);
        pair: IPair<T> = Pair.call(this);
        skip: ISkip<T> = Skip.call(this);
        take: ITake<T> = Take.call(this);
        unique: IUnique<T> = Unique.call(this);
        with: IWith<T> = With.call(this);
        zip: IZip<T> = Zip.call(this);
    }

    function As<T>(): IAs<T> {
        return <TOut>(func: IConverter<T, TOut>): IQuery<TOut> => {
            var stream: ISenderStream<TOut> = new ConvertStream(this.stream, func);
            return new Query(stream);
        }
    }

    function Flatten<T>(): IFlatten<T> {
        return <TOut>(func?: IConverter<T, any>): IQuery<TOut> => {
            var stream: ISenderStream<TOut> = new FlattenStream<T, TOut>(this.stream, func != null ? func : item => item);
            return new Query(stream);
        }
    }

    function Mix<T>(): IMix<T> {
        return { with: MixWith.call(this) };
    }

    function MixWith<T>(): IMixWith<T> {
        return (sender: ISender<T>): IQuery<T> => {
            var stream: ISenderStream<T> = new MixStream(this.stream, sender);
            return new Query(stream);
        }
    }

    function Pair<T>(): IPair<T> {
        return { with: PairWith.call(this) };
    }

    function PairWith<T>(): IPairWith<T> {
        return <TWith>(sender: ISender<TWith>): IPairQuery<T, TWith> => {
            var stream: ISenderStream<IPairing<T, TWith>> = new PairStream<T, TWith>(this.stream, sender);
            return new PairQuery(stream);
        }
    }

    class Pairing<T, TWith> implements IPairing<T, TWith> {
        source: T;
        target: TWith;
        constructor(source: T, target: TWith) { this.source = source; this.target = target; }
    }

    class PairQuery<T, TWith> extends Query<IPairing<T, TWith>> implements IPairQuery<T, TWith> {
        if: IIf<IPairing<T, TWith>> = TakeIf.call(this);
        constructor(iterator: ISenderStream<IPairing<T, TWith>>) { super(iterator) }
    }

    function Skip<T>(): ISkip<T> {
        var object: any = (count: number) => {
            var stream = new FilterStream(this.stream, (item: T, index: number) => index >= count);
            return new Query(stream);
        };
        object.if = SkipIf.call(this);
        object.while = SkipWhile.call(this);
        object.until = SkipUntil.call(this);
        return object;
    }

    function SkipIf<T>(base?: boolean): IIf<T> {
        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new FilterStream(this.stream, (item: T) => !func(item));
            return new Query(stream);
        };
        if (!base) {
            object.not = TakeIf.call(this);
        }
        return object;
    }

    function SkipWhile<T>(base?: boolean): IWhile<T> {
        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new SkipWhileStream(this.stream, func);
            return new Query(stream);
        };
        if (!base) {
            object.not = SkipUntil.call(this, true);
        }
        return object;
    }

    function SkipUntil<T>(base?: boolean): IWhile<T> {
        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new SkipUntilStream(this.stream, func);
            return new Query(stream);
        };
        if (!base) {
            object.not = SkipWhile.call(this, true);
        }
        return object;
    }

    function Take<T>(): ITake<T> {
        var object: any = (count: number) => {
            var stream = new FilterStream(this.stream, (item: T, index: number) => index < count);
            return new Query(stream);
        };
        object.if = TakeIf.call(this);
        object.while = TakeWhile.call(this);
        object.until = TakeUntil.call(this);
        return object;
    }

    function TakeIf<T>(base?: boolean): IIf<T> {
        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new FilterStream(this.stream, func);
            return new Query(stream);
        };
        if (!base) {
            object.not = TakeIf.call(this, true);
        }
        return object;
    }

    function TakeWhile<T>(base?: boolean): IWhile<T> {
        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new TakeWhileStream(this.stream, func);
            return new Query(stream);
        };
        if (!base) {
            object.not = TakeUntil.call(this, true);
        }
        return object;
    }

    function TakeUntil<T>(base?: boolean): IWhile<T> {

        var object: any = (func: IFilter<T>): IQuery<T> => {
            var stream = new TakeUntilStream(this.stream, func);
            return new Query(stream);
        };
        if (!base) {
            object.not = TakeWhile.call(this, true);
        }
        return object;
    }

    function Unique<T>(): IUnique<T> {
        var object: any = (): IQuery<T> => {
            var stream: ISenderStream<T> = new UniqueStream<T>(this.stream);
            return new Query(stream);
        };
        object.by = UniqueBy.call(this);
        return object;
    }

    function UniqueBy<T>(): IUniqueBy<T> {
        return <TKey>(func: IConverter<T, TKey>): IQuery<T> => {
            var stream: ISenderStream<T> = new UniqueByStream(this.stream, func);
            return new Query(stream);
        }
    }

    function With<T>(): IWith<T> {
        return {
            receiver: WithReceiver.call(this),
            function: WithFunction.call(this)
        };
    }

    function WithReceiver<T>(): IWithReceiver<T> {
        return (receiver: IReceiver<T>): void => {
            this.stream.targets.push(receiver);
        };
    }

    function WithFunction<T>(): IWithFunction<T> {
        return (receiver: IReceiver<T>): void => {
            receiver.sources = receiver.sources || [];
            receiver.accept = receiver.accept || function () { return true };
            receiver.receive = receiver.receive || receiver;
            this.stream.targets.push(receiver);
        };
    }

    function Zip<T>(): IZip<T> {
        return { with: ZipWith.call(this) };
    }

    function ZipWith<T>(): IZipWith<T> {
        return <TWith>(sender: ISender<TWith>): IZipQuery<T, TWith> => {
            var stream: ISenderStream<IZipping<T, TWith>> = new ZipStream<T, TWith>(this.stream, sender);
            return new ZipQuery(stream);
        };
    }

    class ZipQuery<T, TWith> extends Query<IZipping<T, TWith>> implements IZipQuery<T, TWith> {
        if: IIf<IZipping<T, TWith>> = TakeIf<IZipping<T, TWith>>();
        constructor(iterator: ISenderStream<IZipping<T, TWith>>) { super(iterator) }
    }

    class Zipping<T, TWith> extends Pairing<T, TWith> implements IPairing<T, TWith> { }

    /*----------------*
     *    Streams     *
     *----------------*/

    class MessengerStream<TIn, TOut> implements IMessengerStream<TIn, TOut> {
        source: ISenderStream<TIn>;
        targets: IReceiverStream<TOut>[];

        value: TOut;

        constructor(source: ISenderStream<TIn>) {
            this.source = source;
            this.source.targets.push(this);
            this.targets = [];
        }

        receive(value: TIn): void {
            throw Error();
        }

        send(value: TOut): void {
            this.value = value;
            this.targets.forEach(target => target.receive(value, this));
        }

        accept(value: TIn): boolean {
            return true;
        }
    }

    class CombineStream<TIn, TWith, TOut> extends MessengerStream<TIn, TOut> implements IReceiverStream<TWith> {
        protected othersource: ISenderStream<TWith>;

        constructor(source: ISenderStream<TIn>, otherparent: ISenderStream<TWith>) {
            super(source);
            this.othersource = otherparent;
            this.othersource.targets.push(this);
        }

        receive(value: TIn|TWith, sender?: ISenderStream<TIn|TWith>): void {
            throw Error();
        }

        accept(value: TIn|TWith): boolean {
            return true;
        }
    }

    class ConvertStream<TIn, TOut> extends MessengerStream<TIn, TOut> {
        private func: IConverter<TIn, TOut>;

        constructor(source: ISenderStream<TIn>, func: IConverter<TIn, TOut>) {
            super(source);
            this.func = func;
        }

        receive(value: TIn): void {
            this.send(this.func(value));
        }
    }

    class FilterStream<T> extends MessengerStream<T, T> {
        private func: IFilter<T>;
        private index: number;

        constructor(source: ISenderStream<T>, func: IFilter<T>) {
            super(source);
            this.func = func;
            this.index = 0;
        }

        receive(value: T): void {
            if (this.func(value, this.index++)) {
                this.send(value);
            }
        }

        accept(value: T): boolean {
            return this.func(value,  this.index);
        }
    }

    class FlattenStream<TIn, TOut> extends MessengerStream<TIn, TOut> {
        private func: IConverter<TIn, TOut[]>;

        constructor(source: ISenderStream<TIn>, func: IConverter<TIn, TOut[]>) {
            super(source);
            this.func = func;
        }

        receive(value: TIn): void {
            var items: TOut[] = this.func(value);
            items.forEach(item => this.send(item));
        }
    }

    class MixStream<T> extends CombineStream<T, T, T> {
        constructor(source: ISenderStream<T>, otherparent: ISenderStream<T>) {
            super(source, otherparent);
        }

        receive(value: T): void {
            this.send(value);
        }
    }

    class PairStream<T, TWith> extends CombineStream<T, TWith, IPairing<T, TWith>> {
        constructor(source: ISenderStream<T>, otherparent: ISenderStream<TWith>) {
            super(source, otherparent);
        }

        receive(value: T|TWith): void {
            if (this.source.value != undefined && this.othersource.value != undefined) {
                this.send(new Zipping(this.source.value, this.othersource.value));
            }
        }
    }

    class SkipWhileStream<T> extends MessengerStream<T, T> {
        private func: IFilter<T>;
        private done: boolean;

        constructor(source: ISenderStream<T>, func: IFilter<T>) {
            super(source);
            this.func = func;
            this.done = false;
        }

        receive(value: T): void {
            if (this.done || !this.func(value)) {
                this.done = true;
                this.send(value);
            }
        }

        accept(value: T): boolean {
            return this.func(value);
        }
    }

    class SkipUntilStream<T> extends SkipWhileStream<T> {
        constructor(parent: ISenderStream<T>, func: IFilter<T>) {
            super(parent, (item: T) => !func(item));
        }
    }

    class TakeWhileStream<T> extends MessengerStream<T, T> {
        private func: IFilter<T>;
        private done: boolean;

        constructor(source: ISenderStream<T>, func: IFilter<T>) {
            super(source);
            this.func = func;
            this.done = false;
        }

        receive(value: T): void {
            if (!this.done && this.func(value)) {
                this.send(value);
            } else {
                this.done = true;
            }
        }

        accept(value: T): boolean {
            return this.func(value);
        }
    }

    class TakeUntilStream<T> extends TakeWhileStream<T> {
        constructor(parent: ISenderStream<T>, func: IFilter<T>) {
            super(parent, (item: T) => !func(item));
        }
    }

    class UniqueByStream<T, TKey> extends MessengerStream<T, T> {
        private func: IConverter<T, TKey>;
        private items: TKey[];

        constructor(source: ISenderStream<T>, func: IConverter<T, TKey>) {
            super(source);
            this.func = func;
            this.items = [];
        }

        receive(value: T): void {
            var key = this.func(value);
            if (this.items.indexOf(key) < 0) {
                this.send(value);
                this.items.push(key);
            }
        }

        accept(value: T): boolean {
            var key = this.func(value);
            return this.items.indexOf(key) < 0;
        }
    }

    class UniqueStream<T> extends UniqueByStream<T, T> {
        constructor(parent: ISenderStream<T>) {
            super(parent, (item: T) => item);
        }
    }

    class ZipStream<T, TWith> extends CombineStream<T, TWith, IZipping<T, TWith>> {
        sourceready: boolean;
        otherready: boolean;

        constructor(source: ISenderStream <T>, othersource: ISenderStream<TWith>) {
            super(source, othersource);
            this.sourceready = false;
            this.otherready = false;
        }

        receive(value: T|TWith, source: ISenderStream<T|TWith>): void {
            var zip: IZipping<T, TWith>;

            this.sourceready = this.sourceready || source == this.source;
            this.otherready = this.otherready || source == this.othersource;

            if (this.sourceready && this.otherready && this.source.value != undefined && this.othersource.value != undefined) {
                zip = new Zipping(this.source.value, this.othersource.value);
                if (this.targets.every(target => !target.accept)
                    || this.targets.some(target => target.accept && target.accept(zip))) {
                    this.send(zip);
                    this.sourceready = false;
                    this.otherready = false;
                }
            }
        }
    }

    /*----------------*
     *   Interfaces   *
     *----------------*/


    interface IFunction<TIn, TOut> extends Function { (value: TIn): TOut; }
    export interface IConverter<TIn, TOut> extends IFunction<TIn, TOut> { }
    export interface IFilter<T> { (item: T, index?: number): boolean }

    interface IMethodDecorator {
        (target: Object, key: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any>;
    }

    interface IReceiverDecorator extends IMethodDecorator { }
    interface ISenderDecorator extends IMethodDecorator { }
    interface IMessengerDecorator extends IMethodDecorator { }

    interface IMessenger<TIn, TOut> extends ISender<TOut>, IReceiver<TIn> { }
    interface IReceiver<T> extends IFunction<T, any>, IReceiverStream<T> { }
    interface ISender<T> extends IFunction<any, T>, ISenderStream<T> { }

    interface IMessengerStream<TIn, TOut> extends ISenderStream<TOut>, IReceiverStream<TIn> { }
    interface ISenderStream<T> {
        value?: T;
        targets?: IReceiverStream<T>[];
        send?(value: T);
    }
    interface IReceiverStream<T> {
        sources?: ISenderStream<T>[];
        accept?(value: T): boolean;
        receive?(value: T, sender?: ISenderStream<T>);
    }
    
    export interface IQuery<T> {
        as: IAs<T>;
        flatten: IFlatten<T>;
        mix: IMix<T>;
        pair: IPair<T>;
        skip: ISkip<T>;
        take: ITake<T>;
        unique: IUnique<T>;
        with: IWith<T>;
        zip: IZip<T>;
    }

    interface IAs<T> {
        <TOut>(func: IConverter<T, TOut>): IQuery<TOut>;
    }

    interface IFlatten<T> {
        <TOut>(func?: IConverter<T, TOut[]>): IQuery<TOut>;
    }

    interface IMix<T> {
        with: IMixWith<T>;
    }

    interface IMixWith<T> {
        (sender: ISender<T>): IQuery<T>;
    }

    interface IIf<T> {
        (func: IFilter<T>): IQuery<T>;
        not: INot<T>;
    }

    interface INot<T> {
        (func: IFilter<T>): IQuery<T>;
    }

    interface IPair<T> {
        with: IPairWith<T>;
    }

    interface IPairWith<T> {
        <TWith>(sender: ISender<TWith>): IPairQuery<T, TWith>;
    }

    interface IPairQuery<T, TWith> extends IQuery<IPairing<T, TWith>> {
        if: IIf<IPairing<T, TWith>>;
    }

    interface IPairing<T, TWith> {
        source: T;
        target: TWith;
    }

    interface ISkip<T> {
        (count: number): IQuery<T>;
        if: IIf<T>;
        while: IWhile<T>;
        until: IUntil<T>;
    }

    interface ITake<T> {
        (count: number): IQuery<T>;
        if: IIf<T>;
        while: IWhile<T>;
        until: IUntil<T>;
    }

    interface IUnique<T> {
        (): IQuery<T>;
        by: IUniqueBy<T>;
    }

    interface IUniqueBy<T> {
        <TKey>(func: IConverter<T, TKey>): IQuery<T>;
    }

    interface IUntil<T> {
        (func: IFilter<T>): IQuery<T>;
        not: INot<T>;
    }

    interface IWith<T> {
        receiver: IWithReceiver<T>;
        function: IWithFunction<T>;
    }

    interface IWithFunction<T> {
        (receiver: IReceiver<T>): void;
    }

    interface IWithReceiver<T> {
        (receiver: IReceiver<T>): void;
    }

    interface IWhile<T> {
        (func: IFilter<T>): IQuery<T>;
        not: INot<T>;
    }

    interface IZip<T> {
        with: IZipWith<T>;
    }

    interface IZipWith<T> {
        <T, TWith>(sender: ISender<T>): IZipQuery<T, TWith>;
    }

    interface IZipQuery<T, TWith> extends IQuery<IZipping<T, TWith>> {
        if: IIf<IZipping<T, TWith>>;
    }

    interface IZipping<T, TWith> {
        source: T;
        target: TWith;
    }
}


var messenger = Respond.messenger;
var sender = Respond.sender;
var receiver = Respond.receiver;
