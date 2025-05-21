FROM mysql:8.4.5
COPY ./files/db/mysqld-docker.cnf /etc/mysql/conf.d/
ENV TZ=Asia/Tehran
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
