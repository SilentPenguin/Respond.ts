/// <reference path="../../test.ts/test.ts/assert.ts" />
/// <reference path="../../test.ts/test.ts/report.ts" />
/// <reference path="../respond.ts/respond.ts" />
/// <reference path="../../test.ts/test.ts/test.ts" />

class MyClass {
    value: string;

    @sender
    sender(input: number): string {
        return input.toString();
    }

    @messenger
    messenger(input: any): string {
        return (input + 2).toString();
    }

    @receiver
    receiver(input: string) {
        this.value = input;
    }
}

class RespondTests extends Test.Case {
    target: MyClass;

    before(): void {
        this.target = new MyClass();

        Assert.that(this.target.value).is.undefined();
    }

    @test
    Sender(): void {
        Respond.to.sender(this.target.sender).with.receiver(this.target.receiver);

        this.target.sender(1);

        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    Messenger(): void {
        Respond.to.sender(this.target.messenger).with.receiver(this.target.receiver);

        this.target.messenger(1);

        Assert.that(this.target.value).is.exact.to('3');
    }

    @test
    Disconnect(): void {
        Respond.to.sender(this.target.sender).with.receiver(this.target.receiver);
        this.target.sender(1);
        Respond.to.sender(this.target.sender).withhold.receiver(this.target.receiver);
        this.target.sender(2);
        Assert.that(this.target.value).is.not.exact.to('2');
    }

    @test
    MultiConnection(): void {
        Respond.to.sender(this.target.sender).with.receiver(this.target.receiver);
        Respond.to.sender(this.target.messenger).with.receiver(this.target.receiver);

        this.target.sender(1);
        Assert.that(this.target.value).is.exact.to('1');

        this.target.messenger(2);
        Assert.that(this.target.value).is.exact.to('4');
    }

    @test
    ChainConnection(): void {
        Respond.to.sender(this.target.sender).with.receiver(this.target.messenger);
        Respond.to.sender(this.target.messenger).with.receiver(this.target.receiver);

        this.target.sender(1);
        Assert.that(this.target.value).is.exact.to('12');
    }
}

window.onload = () => {
    document.getElementById('content').innerHTML = new Report.Html(new RespondTests).run();
};