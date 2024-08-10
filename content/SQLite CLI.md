---
title: SQLite CLI
description: Learning about the SQLite Command Line Interface.
date: 2023-07-15
updated: 2023-07-16
tags:
  - evergreen
---

[SQLite](https://www.sqlite.org/index.html) provides a [Command Line Interface](https://www.sqlite.org/cli.html) (CLI) program named `sqlite3`. And it's already installed on most operating systems.

## Basic usage

The CLI can be run with or without command line options (flags).

When a flag is provided, it must be prefixed with `-` or `--`. For example, `-version` and `--version` do the same thing:

```sh
sqlite3 -version
```

When `sqlite3` is run without flags, it will connect to a temporary in-memory database (which will be deleted on exit) in **interactive mode**:

```sh
sqlite3

SQLite version 3.37.0 2021-12-09 01:34:53
Enter ".help" for usage hints.
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.

sqlite>
```

When in interactive mode, the prompt is `sqlite>` and it reads text input from the keyboard:

- SQL statements.
- Dot commands like `.open` (where some dot commands also accept flags).

But it's also possible to redirect `sqlite3` I/O (input/output) to:

- [[#Read SQL statements from a file]]
- [[#Write results to a file]]

### Help

To see how to use the CLI (and print all available CLI flags):

```sh
sqlite3 -help
```

To print all available dot commands (in interactive mode):

```sh
sqlite> .help
```

To see how to use a dot command (in interactive mode), and print available dot command flags, run `.help DOT_COMMAND`. For example:

```sh
sqlite> .help .import
```

## Open a database

When a filename is provided to the `sqlite3` command, it will either create a new database or open an existing database in interactive mode:

```sh
sqlite3 mydb
```

In interactive mode, a connection to a new or existing database can always be created via the `.open` dot command. And to connect to a temporary in-memory database, use `:memory:` as the database file name.

To destroy any data in an existing database run `.open -new FILENAME`. For example:

```sh
sqlite> .open -new existingdb
```

To open a database in read-only mode use the `-readonly` flag:

```sh
sqlite3 -readonly mydb
```

This also works in interactive mode:

```sh
sqlite> .open -readonly myotherdb
```

## Databases and schemas

To see all databases in interactive mode:

```sh
sqlite> .databases
```

To see all tables (including [attached databases](https://www.sqlite.org/lang_attach.html)) in interactive mode:

```sh
sqlite> .tables
```

To see all indexes in interactive mode:

```sh
sqlite> .indexes
sqlite> .indexes tablename
```

To see the complete schema of the database (including attached databases) in interactive mode:

```sh
sqlite> .schema
sqlite> .schema tablename
```

## Read SQL statements from a file

In interactive mode the `.read` dot command can be used to read SQL statements (and dot commands) from a file:

```sh
sqlite> .read script.sql
```

### Pipe input

If the argument to `.read` begins with the pipe symbol (`|`), then instead of opening the argument as a file, it runs the argument as a command, and uses the output of that command as its input. This can be useful to run scripts that generate SQL.

## Write results to a file

By default `sqlite3` sends all output to "standard output", but this can be changed via the `.output` and `.once` dot commands in interactive mode.

To output _all_ query results to a file:

```sh
sqlite> .mode list
sqlite> .separator ,
sqlite> .output books_and_authors.txt
sqlite>
sqlite> SELECT * FROM books;
sqlite> SELECT * FROM authors;
sqlite>
sqlite> .exit
```

To do the above just once, use the `.once` dot command instead.

### Pipe results

If the argument to `.output` or `.once` begins with the pipe symbol (`|`), then it runs the argument as a command, and the output is sent to that command.

For example:

```sh
sqlite> .once | open -f
sqlite> SELECT * FROM books;
```

## Load file content into a table column

The `readfile()` function loads file content as a `BLOB` in interactive mode. For example:

```sh
sqlite> CREATE TABLE images(
sqlite> name TEXT,
sqlite> type TEXT,
sqlite> img BLOB
sqlite> );
sqlite>
sqlite> INSERT INTO images(name,type,img)
sqlite> VALUES('icon','png',readfile('icon.png'));
```

## Write a table column to a file

The `writefile()` function writes a column value to a file in interactive mode. For example:

```sh
sqlite> SELECT writefile('icon.png',img) FROM images WHERE name='icon';
```

## Import CSV into table

To import a CSV file into a table in interactive mode:

```sh
sqlite> .import -csv file.csv tablename
```

And to import into a table not part of the "main" database the `-schema` flag can be used. This specifies that the table is part of another "schema" (useful for attached databases or to import into a temporary table).

## Export results to CSV

To export results to a CSV file in interactive mode:

```sh
sqlite> .headers on
sqlite> .mode csv
sqlite> .once ~/data.csv
sqlite>
sqlite> SELECT * FROM table;
sqlite>
sqlite> .exit
```

## Dump and restore a database

Dump (converts entire database content into a single UTF-8 text file):

```sh
sqlite3 mydb .dump | gzip -c > mydb.dump.gz
```

Restore:

```sh
zcat mydb.dump.gz | sqlite3 mydb
```

## Configuration

An `.sqliterc` resource file can be created in the "home directory" to configure dot command settings. For example to change the output format for all queries:

```ini title="~/.sqliterc"
.mode box
```

After creating the `.sqliterc` file, it will be loaded on startup:

```sh {3}
sqlite3 mydb

-- Loading resources from /Users/daniel/.sqliterc
SQLite version 3.37.0 2021-12-09 01:34:53
Enter ".help" for usage hints.

sqlite>
```

## One-line commands

It's possible to "bypass" interactive mode and run SQL statements directly when using the `sqlite3` command via the last argument:

```sh
sqlite3 mydb "SELECT * FROM table;"
```

And by using CLI flags like `-cmd` it's possible to shorten certain actions.

### One-line import and query CSV

```sh
sqlite3 -csv -cmd ".import ~/data.csv data" :memory: "SELECT * FROM data;"
```

### One-line export results to CSV

```sh
sqlite3 -csv -header mydb "SELECT * FROM books;" > ~/books.csv
```
