import { QueueService } from "../queue/QueueService";

const queueService = new QueueService();

console.log("==================================");
console.log("QUEUE SERVICE TEST");
console.log("==================================");

//
// Test 1 : Empty ID
//
try {

    queueService.enqueue("", "echo Hello");

} catch (error) {

    console.log("\nTest 1 - Empty ID");

    if (error instanceof Error) {
    console.log(`${error.name}: ${error.message}`);
}

}

//
// Test 2 : Empty Command
//
try {

    queueService.enqueue("job-1", "");

} catch (error) {

    console.log("\nTest 2 - Empty Command");

    if (error instanceof Error) {
    console.log(`${error.name}: ${error.message}`);
}

}

//
// Test 3 : Negative Retries
//
try {

    queueService.enqueue("job-2", "echo Hello", -1);

} catch (error) {

    console.log("\nTest 3 - Negative Retries");

    if (error instanceof Error) {
    console.log(`${error.name}: ${error.message}`);
}

}

//
// Test 4 : Successful Insert
//
const uniqueId = `job-${Date.now()}`;

try {

    const job = queueService.enqueue(
        uniqueId,
        "echo Hello QueueCTL"
    );

    console.log("\nTest 4 - Successful Insert");

    console.log(job);

} catch (error) {

    if (error instanceof Error) {
    console.log(`${error.name}: ${error.message}`);
}

}

//
// Test 5 : Duplicate ID
//
try {

    queueService.enqueue(
        uniqueId,
        "echo Duplicate"
    );

} catch (error) {

    console.log("\nTest 5 - Duplicate Job");

    if (error instanceof Error) {
    console.log(`${error.name}: ${error.message}`);
}

}

console.log("\n==================================");
console.log("TEST COMPLETED");
console.log("==================================");