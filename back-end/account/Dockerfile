FROM python:3.11.6

WORKDIR /app

COPY ./requirements.txt /app/requirements.txt

RUN apt-get update \
    && apt-get install gcc postgresql-client -y \
    && apt-get clean

RUN pip install -r /app/requirements.txt \
    && rm -rf /root/.cache/pip

COPY . /app/

COPY db-check.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/db-check.sh
