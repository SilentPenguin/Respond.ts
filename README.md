# Respond.ts

Respond.ts is a simple framework for publisher and subscriber handling.

Respond.ts is inspired by the observer pattern implemented in Rx's streams. Respond.ts allows a single function call to cascade into multiple function calls.

Respond.ts has a similar counterpart, [Listen.ts](https://github.com/SilentPenguin/Listen.ts).
Listen.ts implements concurrent events, rather than chained events.

# What do the handlers look like

Below is a stripped down example containing some of the ideas behind Respond.ts:
  
```typescript
/// <reference path="respond.ts" />

interface IMyClass {
    MySender: (value: number) => void;
}

class MyClass implements IMyClass
{
    @sender
    MySender(value: number): number {
        return value + 1;
    }
    
    @receiver
    MyReceiver(value: number) {
        console.log(value);
    }
}

var instance: IMyClass = new MyClass();

Respond.to.sender(instance.MySender).with.receiver(instance.MyReceiver);

instance.MySender(2); // console output: 3
```

In this example, `MySender` is called with a value.
Once `MySender` has completed, the return value is passed into `MyReceiver`.

#Getting Started
Please refer to the [wiki](https://github.com/SilentPenguin/Respond.ts/wiki) for more infomation on working with Listen.ts.
