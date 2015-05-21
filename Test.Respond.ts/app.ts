/// <reference path="../../test.ts/test.ts/assert.ts" />
/// <reference path="../../test.ts/test.ts/report.ts" />
/// <reference path="../respond.ts/respond.ts" />
/// <reference path="../../test.ts/test.ts/test.ts" />

class MyClass {
    value: any;

    @sender
    senderNumber(input: number): string {
        return input.toString();
    }

    @sender
    senderString(input: string): number {
        return Number(input);
    }

    @receiver
    receiverString(input: string) {
        this.value = input;
    }

    @receiver
    receiverNumber(input: number) {
        this.value = input;
    }

    @receiver
    receiverAny(input: any) {
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
    Connect() {
        Respond.to.sender(this.target.senderNumber).with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    As() {
        Respond.to.sender(this.target.senderString).as(item => item.toString()).with.receiver(this.target.receiverString);
        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    Mix() {
        Respond.to.sender(this.target.senderString).as(item => item.toString())
            .mix.with(this.target.senderNumber)
            .with.receiver(this.target.receiverString);

        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to('1');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
    }

    @test
    Pair() {
        Respond.to.sender(this.target.senderNumber)
            .pair.with(this.target.senderString)
            .with.receiver(this.target.receiverAny);

        this.target.senderNumber(1);
        Assert.that(this.target.value).is.undefined();
        this.target.senderString('2');
        Assert.that(this.target.value.source).is.exact.to('1');
        Assert.that(this.target.value.target).is.exact.to(2);
        this.target.senderNumber(3);
        Assert.that(this.target.value.source).is.exact.to('3');
        Assert.that(this.target.value.target).is.exact.to(2);
    }

    @test
    Skip() {
        Respond.to.sender(this.target.senderNumber).skip(1).with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.undefined();
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
    }

    @test
    SkipIf() {
        Respond.to.sender(this.target.senderNumber).skip.if(value => value == '2').with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('1');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    SkipWhile() {
        Respond.to.sender(this.target.senderNumber).skip.while(value => value == '2').with.receiver(this.target.receiverString);
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.undefined();
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.undefined();
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('1');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
    }

    @test
    Take() {
        Respond.to.sender(this.target.senderNumber).take(1).with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('1');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    TakeIf() {
        Respond.to.sender(this.target.senderNumber).take.if(value => value == '2').with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.undefined();
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
    }

    @test
    TakeWhile() {
        Respond.to.sender(this.target.senderNumber).take.while(value => value == '2').with.receiver(this.target.receiverString);
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('2');
        this.target.senderNumber(3);
        Assert.that(this.target.value).is.exact.to('2');
    }

    @test
    Unique() {
        Respond.to.sender(this.target.senderNumber).unique().with.receiver(this.target.receiverString);
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('1');
        this.target.senderNumber(2);
        Assert.that(this.target.value).is.exact.to('2');
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.exact.to('2');
        this.target.senderNumber(3);
        Assert.that(this.target.value).is.exact.to('3');
    }

    @test
    Zip() {
        Respond.to.sender(this.target.senderNumber)
            .zip.with(this.target.senderString)
            .with.receiver(this.target.receiverAny);

        this.target.senderNumber(1);
        Assert.that(this.target.value).is.undefined();
        this.target.senderString('2');
        Assert.that(this.target.value.source).is.exact.to('1');
        Assert.that(this.target.value.target).is.exact.to(2);
        this.target.senderNumber(3);
        Assert.that(this.target.value.source).is.exact.to('1');
        Assert.that(this.target.value.target).is.exact.to(2);
        this.target.senderString('4');
        Assert.that(this.target.value.source).is.exact.to('3');
        Assert.that(this.target.value.target).is.exact.to(4);
    }
}


/*
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

    @test
    When(): void {
        Respond.to.sender(this.target.sender).with.receiver(this.target.receiver).when(str => str == '0');
        this.target.sender(0);
        Assert.that(this.target.value).is.exact.to('0');
        this.target.sender(1);
        Assert.that(this.target.value).is.not.exact.to('1');
    }
}
*/
window.onload = () => {
    document.getElementById('content').innerHTML = new Report.Html(new RespondTests).run();
};