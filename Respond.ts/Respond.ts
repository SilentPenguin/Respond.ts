module Respond {
    /*----------------*
     *   Decorators   *
     *----------------*/

    function MessengerDecorator(): ISenderDecorator {
        return <T extends Function>(target: Object, key: string, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> => {
            descriptor = { get: MessengerConstructor(key, descriptor.value) };
            return descriptor;
        };
    }

    function MessengerConstructor<T extends Function>(key: string, func: T): any {
        return function (): IMessenger<any, any> {
            var value = function (...rest: any[]) {
                var result = func.apply(this, rest);
                this[key].targets.forEach(item => item.trigger(result));
                return result;
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
                var result = func.apply(this, rest);
                this[key].targets.forEach(item => item.trigger(result));
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

            return this[key];
        }
    }

    export var messenger: IMessengerDecorator = MessengerDecorator();
    export var sender: ISenderDecorator = SenderDecorator();
    export var receiver: IReceiverDecorator = ReceiverDecorator();

    /*----------------*
     * Implementation *
     *----------------*/

    class Connection<T> implements IConnection<T> {
        sender: ISender<T>;
        receiver: IReceiver<T>;
        condition: (...rest: any[]) => boolean;

        constructor(sender: ISender<T>, receiver: IReceiver<T>) {
            this.sender = sender;
            this.receiver = receiver;

            this.sender.targets.push(this);
            this.receiver.sources.push(this);
        }

        trigger(value: T): void {
            if (this.condition == null || this.condition.call(null, value)) {
                this.receiver.call(null, value);
            }
        }

        when(condition: IFunction<T, boolean>) {
            this.condition = <any>condition;
        }
    }

    /*----------------*
     *    Queries     *
     *----------------*/

    export var to: ITo = {
        sender: ToSender()
    };

    function ToSender(): IToSender {
        return <T>(sender: ISender<T>): ISenderQuery<T> => {
            return new SenderQuery(sender);
        }
    }

    class SenderQuery<T> implements ISenderQuery<T> {
        sender: ISender<T>;
        with: IWith<T> = With.call(this);
        withhold: IWithhold<T> = Withhold.call(this);

        constructor(sender: ISender<T>) {
            this.sender = sender;
        }

        connection(receiver: IReceiver<T>): IConnection<T> {
            var result: IConnection<T>;
            this.sender.targets.forEach(item => result = item.receiver == receiver ? item : result);
            return result;
        }

        remove(receiver: IReceiver<T>): void {
            var connection: IConnection<T> = this.connection(receiver);
            if (connection) {
                connection.sender.targets = connection.sender.targets.filter(item => item != connection);
                connection.receiver.sources = connection.receiver.sources.filter(item => item != connection);
            }
        }
    }

    function With<T>(): IWith<T> {
        return {
            receiver: (receiver: IReceiver<T>): IConnection<T> => {
                var result: IConnection<T> = this.connection(receiver) || new Connection(this.sender, receiver);
                return result;
            },
            function: (receiver: IReceiver<T>): IConnection<T> => {
                (<any>receiver).sources = (<any>receiver).sources || [];
                var result: IConnection<T> = this.connection(receiver) || new Connection(this.sender, receiver);
                return result;
            }
        }
    }

    function Withhold<T>(): IWithhold<T> {
        return {
            receiver: (receiver: IReceiver<T>): void => {
                this.remove(receiver);
            },
            function: (receiver: IReceiver<T>): void => {
                this.remove(receiver);
            }
        }
    }

    /*----------------*
     *   Interfaces   *
     *----------------*/

    interface IMethodDecorator {
        (target: Object, key: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any>;
    }

    interface IReceiverDecorator extends IMethodDecorator { }

    interface ISenderDecorator extends IMethodDecorator { }

    interface IMessengerDecorator extends IMethodDecorator { }

    interface IReceiver<T> extends IFunction<T, any> {
        sources?: IConnection<T>[];
    }

    interface ISender<T> extends IFunction<any, T> {
        targets?: IConnection<T>[];
    }

    interface IMessenger<TIn, TOut> extends ISender<TOut>, IReceiver<TIn> { }

    interface IFunction<TIn, TOut> extends Function {
        (value: TIn): TOut;
    }

    interface ITo {
        sender: IToSender;
    }

    interface IToSender {
        <T>(sender: ISender<T>): ISenderQuery<T>
    }

    interface ISenderQuery<T> {
        with: IWith<T>;
        withhold: IWithhold<T>;
    }

    interface IWith<T> {
        receiver: (receiver: IReceiver<T>) => IConnection<T>;
        function: (func: IReceiver<T>) => IConnection<T>;
    }

    interface IWithhold<T> {
        receiver: (receiver: IReceiver<T>) => void;
        function: (func: IReceiver<T>) => void;
    }

    interface IConnection<T> {
        sender: ISender<T>;
        receiver: IReceiver<T>;
        when: IWhen<T>;
    }

    interface IWhen<T> {
        (condition: IFunction<T, boolean>): void;
    }
}

var messenger = Respond.messenger;
var sender = Respond.sender;
var receiver = Respond.receiver;