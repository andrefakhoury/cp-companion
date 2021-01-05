const app = require('express')();
const bodyParser = require('body-parser');
const fs = require('fs');
const { execSync } = require("child_process");
const path = require('path');

const port = 10043;

// const paths locations
const relPathTasks = `problems/contest`; // relative path to task folder
const pathTasks = `/home/fakhoury/Documents/competitive-programming/${relPathTasks}`; // absolute path to tasks
const pathCMakeList = `/home/fakhoury/Documents/competitive-programming/CMakeLists.txt`; // cmakelists absolute path
const pathTemplate = `/home/fakhoury/Documents/competitive-programming/lib/misc/environment/clion_template.cpp`; // path to template

// returns the task name according to problem name.
// This could be waaay better, but works nicely for codeforces and atcoder by now
function getTaskName(data) {
	if (data.url.includes('codeforces')) {
		return data.name.split('.')[0];
	} else if (data.url.includes('atcoder')) {
		return data.name.split(' ')[0];
	}
	return data.languages.java.taskClass;
}

// main function
app.use(bodyParser.json());
app.post('/', (req, res) => {
	const data = req.body;
	// console.log(JSON.stringify(data, null, 4));

	const taskName = getTaskName(data); // A, B, ...
	const sourceName = `${taskName}`; // source.cpp
	const taskFolder = `${taskName}`; // name of the folder that will be created
	const taskPath = `${pathTasks}/${taskFolder}`; // path to current folder

	console.log(`Parsing problem ${data.name} [${taskName}]`);

	fs.mkdirSync(taskPath, { recursive: true}, (err) => { if (err) throw err; });
	console.log(` > Created path ${taskPath}`);

	fs.copyFileSync(pathTemplate, `${taskPath}/${sourceName}.cpp`, (err) => { if (err) throw err; });
	console.log(` > Created template ${sourceName}.cpp`);

	fs.readdir(taskPath, (err, files) => {
		if (err) return console.log(err);

		files.forEach((file, index) => {
			if (path.extname(file) == ".in" || path.extname(file) == ".out") {
				fs.unlinkSync(`${taskPath}/${file}`, (err2) => {
					if (err2) return console.log(err2);
					console.log(` >>> Deleted old sample ${file}`);
				});
			}
		});

		// create new samples
		for (var test in data.tests) {
			fs.writeFileSync(`${taskPath}/${test}.in`, `${data.tests[test].input}`, function(err2) {
				if (err2) return console.log(err2);
				console.log(` >> Created input ${test}`);
			});

			fs.writeFileSync(`${taskPath}/${test}.out`, `${data.tests[test].output}`, function(err2) {
				if (err2) return console.log(err2);
				console.log(` >> Created output ${test}`);
			});
		}
	});

	const cmExec = `add_executable(${taskName} ${relPathTasks}/${taskFolder}/${sourceName}.cpp)`;
	const cmProp = `set_target_properties(${taskName} PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${taskPath}/")`;

	fs.readFile(pathCMakeList, (err, data) => {
		if (err) throw err;
		if (!data.includes(cmExec)) {
			fs.appendFileSync(pathCMakeList, `\n${cmExec}\n${cmProp}\n`, (err2) => {
				if (err2) throw err2;
				console.log(` > Updated CMakeLists`);
			});
		}
	});
	
	execSync(`/opt/clion-2020.3/bin/clion.sh --line 28 ${taskPath}/${sourceName}.cpp`, function(err) { if (err) return console.log(err); });

	console.log(`Finished parsing ${data.name}`);

	res.sendStatus(200);
});

app.listen(port, err => {
	if (err) {
		console.error(err);
		process.exit(1);
	}

	console.log(`Listening on port ${port}`);
});
