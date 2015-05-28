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

    function PropertyDecorator(): IPropertyDecorator {
        return <T>(target: Object, key: string) => {
            Object.defineProperty(target, key,
                {
                    get: function () {
                        if (this[key + '_observer'] == undefined) {
                            this[key + '_observer'] = new Observable<T>();
                        }
                        return this[key + '_observer'];
                    },
                    set: function (value) {
                        this[key].receive(value);
                    }
                }
                );
        }
    }

    class Observable<T> {
        value: T;
        sources: ISenderStream<T>[];
        targets: IReceiverStream<T>[];

        constructor() {
            this.sources = [];
            this.targets = [];
        }

        send(value: T) {
            this.targets.forEach(target => target.receive(this.value, this));
        }

        receive(value: T) {
            this.value = value;
            this.send(value);
        }
    }

    export var messenger: IMessengerDecorator = MessengerDecorator();
    export var sender: ISenderDecorator = SenderDecorator();
    export var receiver: IReceiverDecorator = ReceiverDecorator();
    export var property: IPropertyDecorator = PropertyDecorator();

    /*----------------*
     * Implementation *
     *----------------*/

    export var to = {
        interval: (ms: number): IQuery<number> => {
            var stream: ISenderStream<number> = new TimerStream(ms);
            return new Query(stream);
        },
        property: <T>(property: T): IQuery<T> => {
            return new Query<T>(<any>property);
        },
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
        count: ICount<T> = Count.call(this);
        delay: IDelay<T> = Delay.call(this);
        flatten: IFlatten<T> = Flatten.call(this);
        group: IGroup<T> = Group.call(this);
        maximum: IMaximum<T> = Maximum.call(this);
        minimum: IMinimum<T> = Minimum.call(this);
        mix: IMix<T> = Mix.call(this);
        pair: IPair<T> = Pair.call(this);
        queue: IQueue<T> = Queue.call(this);
        skip: ISkip<T> = Skip.call(this);
        take: ITake<T> = Take.call(this);
        unique: IUnique<T> = Unique.call(this);
        with: IWith<T> = With.call(this);
        withhold: IWithhold<T> = Withhold.call(this);
        zip: IZip<T> = Zip.call(this);
    }

    function As<T>(): IAs<T> {
        return <TOut>(func: IConverter<T, TOut>): IQuery<TOut> => {
            var stream: ISenderStream<TOut> = new ConvertStream(this.stream, func);
            return new Query(stream);
        }
    }

    function Count<T>(): ICount<T> {
        return (): IQuery<number> => {
            var stream: ISenderStream<number> = new CountStream(this.stream);
            return new Query(stream);
        }
    }

    function Delay<T>(): IDelay<T> {
        return {
            for: (ms: number): IQuery<T> => {
                var stream: ISenderStream<T> = new DelayStream<T>(this.stream, ms);
                return new Query(stream);
            }
        }
    }

    function Flatten<T>(): IFlatten<T> {
        return <TOut>(func?: IConverter<T, any>): IQuery<TOut> => {
            var stream: ISenderStream<TOut> = new FlattenStream<T, TOut>(this.stream, func != null ? func : item => item);
            return new Query(stream);
        }
    }

    function Group<T>(): IGroup<T> {
        return {
            by: GroupBy.call(this),
            for: GroupFor.call(this),
            of: GroupOf.call(this),
            with: GroupWith.call(this)
        }
    }

    function GroupOf<T>(): IGroupFor<T> {
        return (count: number): IQuery<IGrouping<number, T>> => {
            var stream: ISenderStream<IGrouping<number, T>> = new GroupCountStream<T>(this.stream, count);
            return new Query(stream);
        }
    }

    function GroupFor<T>(): IGroupFor<T> {
        return (ms: number): IQuery<IGrouping<number, T>> => {
            var stream: ISenderStream<IGrouping<number, T>> = new GroupTimerStream<T>(this.stream, ms);
            return new Query(stream);
        }
    }

    function GroupBy<T>(): IGroupBy<T> {
        return <TWith>(func: IConverter<T, TWith>): IQuery<IGrouping<TWith, T>> => {
            var stream: ISenderStream<IGrouping<TWith, T>> = new GroupByStream<TWith, T>(this.stream, func);
            return new Query(stream);
        }
    }

    function GroupWith<T>(): IGroupWith<T> {
        return <TWith>(sender: ISenderStream<TWith>): IQuery<IGrouping<TWith, T>> => {
            var stream: ISenderStream<IGrouping<TWith, T>> = new GroupWithStream<TWith, T>(this.stream, sender);
            return new Query(stream);
        }
    }

    class Grouping<TKey, TValue> {
        key: TKey;
        values: TValue[];
        constructor(key: TKey, values: TValue[]) {
            this.key = key;
            this.values = values;
        }
    }

    function Maximum<T>(): IMaximum<T> {
        var object: any = () => { return this.maximum.by(item => item); }
        object.by = <TKey>(func: IConverter<T, TKey>) => {
            var sender: ISenderStream<T> = new MaximumStream(this.stream, func);
            return new Query(sender);
        }
        return object;
    }

    function Minimum<T>(): IMinimum<T> {
        var object: any = () => { return this.minimum.by(item => item); }
        object.by = <TKey>(func: IConverter<T, TKey>) => {
            var sender: ISenderStream<T> = new MinimumStream(this.stream, func);
            return new Query(sender);
        }
        return object;
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

    function Queue<T>(): IQueue<T> {
        return {
            by: QueueBy.call(this),
            for: QueueFor.call(this),
            of: QueueOf.call(this),
            with: QueueWith.call(this)
        }
    }

    function QueueOf<T>(): IQueueFor<T> {
        return (count: number): IQuery<T> => {
            return this.group.of(count).flatten(pair => pair.values);
        }
    }

    function QueueFor<T>(): IQueueFor<T> {
        return (ms: number): IQuery<T> => {
            return this.group.for(ms).flatten(pair => pair.values);
        }
    }

    function QueueBy<T>(): IQueueBy<T> {
        return <TWith>(func: IConverter<T, TWith>): IQuery<T> => {
            return this.group.by(func).flatten(pair => pair.values);
        }
    }

    function QueueWith<T>(): IQueueWith<T> {
        return <TWith>(sender: ISenderStream<TWith>): IQuery<T> => {
            return this.group.with(sender).flatten(pair => pair.values);
        }
    }

    function Skip<T>(): ISkip<T> {
        var object: any = (count: number) => {
            return this.skip.while((item: T, index: number) => index < count);
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
            return this.take.while((item: T, index: number) => index < count);
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
            function: WithFunction.call(this),
            property: WithProperty.call(this),
            receiver: WithReceiver.call(this)
        };
    }

    function WithFunction<T>(): IWithFunction<T> {
        return (receiver: IReceiver<T>): void => {
            receiver.sources = receiver.sources || [];
            receiver.accept = receiver.accept || function () { return true };
            receiver.receive = receiver.receive || receiver;
            subscribe(this.stream, receiver);
        };
    }

    function WithProperty<T>(): IWithProperty<T> {
        return (receiver: T): void => {
            subscribe(this.stream, receiver);
        };
    }

    function WithReceiver<T>(): IWithReceiver<T> {
        return (receiver: IReceiver<T>): void => {
            subscribe(this.stream, receiver);
        };
    }
    function Withhold<T>(): IWithhold<T> {
        return {
            function: WithholdFunction.call(this),
            property: WithholdProperty.call(this),
            receiver: WithholdReceiver.call(this)
        };
    }

    function WithholdFunction<T>(): IWithholdFunction<T> {
        return (receiver: IReceiver<T>): void => {
            unsubscribe(this.stream, receiver);
        }
    }

    function WithholdProperty<T>(): IWithholdProperty<T> {
        return (receiver: T): void => {
            unsubscribe(this.stream, receiver);
        }
    }

    function WithholdReceiver<T>(): IWithholdReceiver<T> {
        return (receiver: IReceiver<T>): void => {
            unsubscribe(this.stream, receiver);
        }
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

    function subscribe<T>(sender: ISenderStream<T>, receiver: IReceiverStream<T>): void {
        sender.targets.push(receiver);
        receiver.sources.push(sender);
    }

    function unsubscribe<T>(sender: ISenderStream<T>, receiver: IReceiverStream<T>, up: boolean = true, down: boolean = true): void {
        if (up) {
            sender.targets = sender.targets.filter(item => receiver !== item);
            sender.targets.filter(item => item instanceof SenderStream).forEach(item => unsubscribe(sender, item, true, false));
        }
        if (down) {
            receiver.sources = receiver.sources.filter(item => sender !== item);
            receiver.sources.filter(item => item instanceof SenderStream).forEach(item => unsubscribe(item, receiver, false, true));
        }

        if (sender instanceof MessengerStream) {
            (<MessengerStream<any, T>>sender).tidy();
        }

        if (receiver instanceof MessengerStream) {
            (<MessengerStream<T, any>>receiver).tidy();
        }
    }

    class SenderStream<T> implements ISenderStream<T> {
        targets: IReceiverStream<T>[];
        value: T;

        constructor() {
            this.targets = [];
        }

        send(value: T): void {
            this.value = value;
            this.targets.forEach(target => target.receive(value, this));
        }
    }

    class MessengerStream<TIn, TOut> extends SenderStream<TOut> implements IMessengerStream<TIn, TOut> {
        source: ISenderStream<TIn>;
        sources: ISenderStream<TIn>[];

        constructor(source: ISenderStream<TIn>) {
            super();
            this.source = source;
            this.sources = [];
            subscribe(source, this);
        }

        receive(value: TIn): void {
            throw Error();
        }

        accept(value: TIn): boolean {
            return true;
        }

        tidy() {
            if (!this.targets.length || !this.sources.length) {
                this.targets.forEach(target => unsubscribe(this, target));
                this.sources.forEach(source => unsubscribe(source, this));
            }
        }
    }

    class CombineStream<TIn, TWith, TOut> extends MessengerStream<TIn, TOut> implements IReceiverStream<TWith> {
        protected othersource: ISenderStream<TWith>;
        sources: ISenderStream<any>[];

        constructor(source: ISenderStream<TIn>, othersource: ISenderStream<TWith>) {
            super(source);
            this.othersource = othersource;
            subscribe(othersource, this);
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

    class CountStream<T> extends MessengerStream<T, number> {
        private count: number;
        private func: IFilter<T>;
        constructor(source: ISenderStream<T>) {
            super(source);
            this.count = 0;
        }

        receive(value: T) {
            this.send(++this.count);
        }
    }

    class DelayStream<T> extends MessengerStream<T, T> {
        ms: number;
        constructor(source: ISenderStream<T>, ms: number) {
            super(source);
            this.ms = ms;
        }

        receive(value: T): void {
            setTimeout(() => {
                this.send(value)
            }, this.ms);
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
            return this.func(value, this.index);
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

    class GroupStream<TKey, TValue> extends MessengerStream<TValue, IGrouping<TKey, TValue>> {
        protected queue: TValue[];

        constructor(source: ISenderStream<TValue>) {
            super(source);
            this.queue = [];
        }

        flush(key: TKey): void {
            if (this.queue.length) {
                var group: IGrouping<TKey, TValue> = new Grouping(key, this.queue);
                this.send(group);
                this.queue = [];
            }
        }
    }

    class GroupByStream<TKey, TValue> extends GroupStream<TKey, TValue> {
        func: IConverter<TValue, TKey>;
        key: TKey;
        constructor(source: ISenderStream<TValue>, func: IConverter<TValue, TKey>) {
            super(source);
            this.func = func;
        }

        receive(value: TValue): void {
            var key: TKey = this.func(value);
            if (key !== this.key) {
                this.flush(this.key);
                this.key = key;
            }

            this.queue.push(value);
        }

        accept(value: TValue): boolean {
            return true;
        }
    }

    class GroupCountStream<T> extends GroupStream<number, T> {
        private limit: number;
        constructor(source: ISenderStream<T>, limit: number) {
            super(source);
            this.limit = limit;
        }

        receive(value: T): void {
            this.queue.push(value);
            if (this.queue.length == this.limit) {
                this.flush(this.limit);
            }
        }
    }

    class GroupTimerStream<T> extends GroupStream<number, T> {
        private ms: number;
        private timer: number;
        private time: number;
        constructor(source: ISenderStream<T>, ms: number) {
            super(source);
            this.ms = ms;
        }

        receive(value: T): void {
            if (!this.queue.length) {
                this.time = performance.now();
            }
            this.queue.push(value);
            clearTimeout(this.timer);
            setTimeout(() => this.flush(performance.now() - this.time), this.ms);
        }
    }

    class GroupWithStream<TKey, TValue> extends GroupStream<TKey, TValue> implements IReceiverStream<TKey> {
        private othersource: ISenderStream<TKey>;
        sources: ISenderStream<any>[];
        constructor(source: ISenderStream<TValue>, othersource: ISenderStream<TKey>) {
            super(source);
            this.othersource = othersource;
            subscribe(othersource, this);
        }

        receive(value: TKey|TValue, source?: ISenderStream<TKey|TValue>): void {
            if (source == this.source) {
                this.queue.push(<TValue>value);
            } else if (source == this.othersource) {
                this.flush(<TKey>value);
            }
        }

        accept(value: TKey|TValue): boolean {
            return true;
        }
    }

    class MaximumStream<TKey, TValue> extends MessengerStream<TValue, TValue> {
        func: IConverter<TValue, TKey>;
        maximum: TKey;
        constructor(source: ISenderStream<TValue>, func: IConverter<TValue, TKey>) {
            super(source);
            this.func = func;
        }
        receive(value: TValue): void {
            var key: TKey = this.func(value);
            if (key >= this.maximum || this.maximum == undefined) {
                this.maximum = key;
                this.send(value);
            }
        }
    }

    class MinimumStream<TKey, TValue> extends MessengerStream<TValue, TValue> {
        func: IConverter<TValue, TKey>;
        minimum: TKey;
        constructor(source: ISenderStream<TValue>, func: IConverter<TValue, TKey>) {
            super(source);
            this.func = func;
        }
        receive(value: TValue): void {
            var key: TKey = this.func(value);
            if (key <= this.minimum || this.minimum == undefined) {
                this.minimum = key;
                this.send(value);
            }
        }
    }

    class MixStream<T> extends CombineStream<T, T, T> {
        constructor(source: ISenderStream<T>, othersource: ISenderStream<T>) {
            super(source, othersource);
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
        private index: number;

        constructor(source: ISenderStream<T>, func: IFilter<T>) {
            super(source);
            this.func = func;
            this.done = false;
            this.index = 0;
        }

        receive(value: T): void {
            if (this.done || !this.func(value, this.index++)) {
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
        private index: number;

        constructor(source: ISenderStream<T>, func: IFilter<T>) {
            super(source);
            this.func = func;
            this.done = false;
            this.index = 0;
        }

        receive(value: T): void {
            if (!this.done && this.func(value, this.index++)) {
                this.send(value);
            } else {
                this.sources.forEach(source => unsubscribe(source, this));
                this.targets.forEach(target => unsubscribe(this, target));
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

    class TimerStream extends SenderStream<number> {
        start: number;
        timer: number;
        constructor(ms: number) {
            super();
            this.start = performance.now();
            this.timer = setInterval(() => this.send(performance.now() - this.start), ms);
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

        constructor(source: ISenderStream<T>, othersource: ISenderStream<TWith>) {
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

    interface IPropertyDecorator {
        (target: Object, key: string): void;
    }

    interface IMethodDecorator {
        (target: Object, key: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any>;
    }

    interface IReceiverDecorator extends IMethodDecorator { }
    interface ISenderDecorator extends IMethodDecorator { }
    interface IMessengerDecorator extends IMethodDecorator { }

    interface IMessenger<TIn, TOut> extends ISender<TOut>, IReceiver<TIn> { }
    interface IReceiver<T> extends IFunction<T, any>, IReceiverStream<T> { }
    interface ISender<T> extends IFunction<any, T>, ISenderStream<T> { }

    interface IMessengerStream<TIn, TOut> extends ISenderStream<TOut>, IReceiverStream<TIn> {
        tidy?(): void;
    }

    interface ISenderStream<T> {
        value?: T;
        targets?: IReceiverStream<T>[];
        send?(value: T): void;
    }

    interface IReceiverStream<T> {
        sources?: ISenderStream<T>[];
        accept?(value: T): boolean;
        receive?(value: T, sender?: ISenderStream<T>): void;
    }

    export interface IQuery<T> {
        as: IAs<T>;
        count: ICount<T>;
        delay: IDelay<T>;
        flatten: IFlatten<T>;
        group: IGroup<T>;
        maximum: IMaximum<T>;
        minimum: IMinimum<T>;
        mix: IMix<T>;
        pair: IPair<T>;
        queue: IQueue<T>;
        skip: ISkip<T>;
        take: ITake<T>;
        unique: IUnique<T>;
        with: IWith<T>;
        withhold: IWithhold<T>;
        zip: IZip<T>;
    }

    interface IAs<T> {
        <TOut>(func: IConverter<T, TOut>): IQuery<TOut>;
    }

    interface ICount<T> {
        (): IQuery<number>;
    }

    interface IDelay<T> {
        for: IDelayFor<T>;
    }

    interface IDelayFor<T> {
        (ms: number): IQuery<T>;
    }

    interface IFlatten<T> {
        <TOut>(func?: IConverter<T, TOut[]>): IQuery<TOut>;
    }

    interface IGroup<T> {
        of: IGroupOf<T>;
        for: IGroupFor<T>;
        by: IGroupBy<T>;
        with: IGroupWith<T>;
    }

    interface IGroupOf<T> {
        (count: number): IQuery<IGrouping<number, T>>;
    }

    interface IGroupFor<T> {
        (ms: number): IQuery<IGrouping<number, T>>;
    }

    interface IGroupBy<T> {
        <TKey>(func: IConverter<T, TKey>): IQuery<IGrouping<TKey, T>>;
    }

    interface IGroupWith<T> {
        <TWith>(sender: ISenderStream<TWith>): IQuery<IGrouping<TWith, T>>;
    }

    interface IGrouping<TKey, TValue> {
        key: TKey;
        values: TValue[];
    }

    interface IMaximum<T> {
        (): IQuery<T>;
    }

    interface IMaximumBy<T> {
        <TKey>(func: IConverter<T, TKey>): IQuery<T>;
    }

    interface IMinimum<T> {
        (): IQuery<T>;
    }

    interface IMinimumBy<T> {
        <TKey>(func: IConverter<T, TKey>): IQuery<T>;
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

    interface IQueue<T> {
        of: IQueueOf<T>;
        for: IQueueFor<T>;
        by: IQueueBy<T>;
        with: IQueueWith<T>;
    }

    interface IQueueOf<T> {
        (count: number): IQuery<T>;
    }

    interface IQueueFor<T> {
        (ms: number): IQuery<T>;
    }

    interface IQueueBy<T> {
        <TKey>(func: IConverter<T, TKey>): IQuery<T>;
    }

    interface IQueueWith<T> {
        <TWith>(sender: ISenderStream<TWith>): IQuery<T>;
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
        function: IWithFunction<T>;
        property: IWithProperty<T>;
        receiver: IWithReceiver<T>;
    }

    interface IWithFunction<T> {
        (receiver: IReceiver<T>): void;
    }

    interface IWithProperty<T> {
        (receiver: T): void;
    }

    interface IWithReceiver<T> {
        (receiver: IReceiver<T>): void;
    }

    interface IWithhold<T> {
        property: IWithholdProperty<T>;
        function: IWithholdFunction<T>;
        receiver: IWithholdReceiver<T>;
    }

    interface IWithholdFunction<T> {
        (receiver: IReceiver<T>): void;
    }

    interface IWithholdProperty<T> {
        (receiver: T): void;
    }

    interface IWithholdReceiver<T> {
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

var property = Respond.property;
var messenger = Respond.messenger;
var sender = Respond.sender;
var receiver = Respond.receiver;