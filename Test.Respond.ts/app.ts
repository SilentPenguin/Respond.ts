/// <reference path="../../test.ts/test.ts/assert.ts" />
/// <reference path="../../test.ts/test.ts/report.ts" />
/// <reference path="../respond.ts/respond.ts" />
/// <reference path="../../test.ts/test.ts/test.ts" />

class MyClass {
    value: any;

    @property
    altValue: number;

    @sender
    senderNumber(input: number): string {
        return input.toString();
    }

    @sender
    senderString(input: string): number {
        return Number(input);
    }

    @sender
    senderArray(input: number[]): number[] {
        return input;
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
    ConnectFunction() {
        var value, func = function (val) { value = val; }
        Respond.to.sender(this.target.senderNumber).with.function(func);
        this.target.senderNumber(1);
        Assert.that(value).is.exact.to('1');
    }

    @test
    ConnectProperty() {
        Respond.to.property(this.target.altValue).with.receiver(this.target.receiverNumber);
        Assert.that(this.target.value).is.undefined();
        this.target.altValue = 1;
        Assert.that(this.target.value).is.exact.to(1);

        Respond.to.sender(this.target.senderString).with.property(this.target.altValue);
        this.target.senderString('2');
        Assert.that(this.target.value).is.exact.to(2);
    }

    @test
    As() {
        Respond.to.sender(this.target.senderString).as(item => item.toString()).with.receiver(this.target.receiverString);
        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to('1');
    }

    @test
    Count() {
        Respond.to.sender(this.target.senderString).count().with.receiver(this.target.receiverNumber);
        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to(1);
        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to(2);
        this.target.senderString('2');
        Assert.that(this.target.value).is.exact.to(3);
    }

    @test
    Delay() {
        Respond.to.sender(this.target.senderNumber).delay.for(4).with.receiver(this.target.receiverString);
        var start = performance.now();
        this.target.senderNumber(1);
        Assert.that(this.target.value).is.undefined();
    }

    @test
    Flatten() {
        Respond.to.sender(this.target.senderArray).flatten().with.receiver(this.target.receiverNumber);
        this.target.senderArray([1,2,3]);
        Assert.that(this.target.value).is.exact.to(3);
    }

    @test
    GroupBy() {
        Respond.to.sender(this.target.senderString).group.by(value => value < 3).with.receiver(this.target.receiverAny);
        this.target.senderString('1');
        this.target.senderString('2');
        Assert.that(this.target.value).is.undefined();
        this.target.senderString('3');
        Assert.that(this.target.value.key).is.exact.to(true);
        Assert.that(this.target.value.values.length).is.exact.to(2);
        Assert.that(this.target.value.values[0]).is.exact.to(1);
        Assert.that(this.target.value.values[1]).is.exact.to(2);
    }

    @test
    GroupOf() {
        Respond.to.sender(this.target.senderString).group.of(2).with.receiver(this.target.receiverAny);
        this.target.senderString('1');

        Assert.that(this.target.value).is.undefined();

        this.target.senderString('2');
        this.target.senderString('3');

        Assert.that(this.target.value.key).is.exact.to(2);
        Assert.that(this.target.value.values.length).is.exact.to(2);
        Assert.that(this.target.value.values[0]).is.exact.to(1);
        Assert.that(this.target.value.values[1]).is.exact.to(2);

        this.target.senderString('4');

        Assert.that(this.target.value.values[0]).is.exact.to(3);
        Assert.that(this.target.value.values[1]).is.exact.to(4);

        this.target.senderString('5');

        Assert.that(this.target.value.values[0]).is.exact.to(3);
        Assert.that(this.target.value.values[1]).is.exact.to(4);
    }

    @test
    GroupWith() {
        Respond.to.sender(this.target.senderString).group.with(this.target.senderNumber).with.receiver(this.target.receiverAny);
        this.target.senderString('1');
        this.target.senderString('2');
        Assert.that(this.target.value).is.undefined();

        this.target.senderNumber(3);

        Assert.that(this.target.value.key).is.exact.to('3');
        Assert.that(this.target.value.values.length).is.exact.to(2);
        Assert.that(this.target.value.values[0]).is.exact.to(1);
        Assert.that(this.target.value.values[1]).is.exact.to(2);
        this.target.senderString('4');
        this.target.senderNumber(5);
        Assert.that(this.target.value.key).is.exact.to('5');
        Assert.that(this.target.value.values.length).is.exact.to(1);
        Assert.that(this.target.value.values[0]).is.exact.to(4);
    }

    @test
    Maximum() {
        Respond.to.sender(this.target.senderString).maximum()
            .with.receiver(this.target.receiverNumber);

        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to(1);
        this.target.senderString('2');
        this.target.senderString('1');
        Assert.that(this.target.value).is.exact.to(2);
    }

    @test
    Minimum() {
        Respond.to.sender(this.target.senderString).minimum()
            .with.receiver(this.target.receiverNumber);

        this.target.senderString('2');
        Assert.that(this.target.value).is.exact.to(2);
        this.target.senderString('1');
        this.target.senderString('2');
        Assert.that(this.target.value).is.exact.to(1);
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
    QueueOf() {
        Respond.to.sender(this.target.senderString).queue.of(2).with.receiver(this.target.receiverNumber);
        this.target.senderString('1');
        Assert.that(this.target.value).is.undefined();
        this.target.senderString('2');
        Assert.that(this.target.value).is.exact.to(2);
        this.target.senderString('3');
        Assert.that(this.target.value).is.exact.to(2);
        this.target.senderString('3');
        Assert.that(this.target.value).is.exact.to(3);
    }

    @test
    QueueWith() {
        Respond.to.sender(this.target.senderString).queue.with(this.target.senderNumber).with.receiver(this.target.receiverNumber);
        this.target.senderString('1');
        this.target.senderString('2');
        Assert.that(this.target.value).is.undefined();
        this.target.senderNumber(3);
        Assert.that(this.target.value).is.exact.to(2);
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

window.onload = () => {
    document.getElementById('content').innerHTML = new Report.Html(new RespondTests).run();
};