import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import dayjs from 'dayjs';
import { filter, map, tap } from 'rxjs/operators';
import { Course, CourseGroup } from 'app/entities/course.model';
import { ProgrammingExercise } from 'app/entities/programming-exercise.model';
import { ModelingExercise } from 'app/entities/modeling-exercise.model';
import { TextExercise } from 'app/entities/text-exercise.model';
import { FileUploadExercise } from 'app/entities/file-upload-exercise.model';
import { Exercise } from 'app/entities/exercise.model';
import { ExerciseService } from 'app/exercises/shared/exercise/exercise.service';
import { User } from 'app/core/user/user.model';
import { LectureService } from 'app/lecture/lecture.service';
import { StatsForDashboard } from 'app/course/dashboards/stats-for-dashboard.model';
import { StudentParticipation } from 'app/entities/participation/student-participation.model';
import { AccountService } from 'app/core/auth/account.service';
import { ParticipationWebsocketService } from 'app/overview/participation-websocket.service';
import { createRequestOption } from 'app/shared/util/request-util';
import { getLatestSubmissionResult, setLatestSubmissionResult, Submission } from 'app/entities/submission.model';
import { SubjectObservablePair } from 'app/utils/rxjs.utils';
import { participationStatus } from 'app/exercises/shared/exercise/exercise-utils';
import { CourseManagementOverviewStatisticsDto } from 'app/course/manage/overview/course-management-overview-statistics-dto.model';
import { addUserIndependentRepositoryUrl } from 'app/overview/participation-utils';
import { ParticipationType } from 'app/entities/participation/participation.model';
import { CourseManagementDetailViewDto } from 'app/course/manage/course-management-detail-view-dto.model';

export type EntityResponseType = HttpResponse<Course>;
export type EntityArrayResponseType = HttpResponse<Course[]>;

@Injectable({ providedIn: 'root' })
export class CourseManagementService {
    private resourceUrl = SERVER_API_URL + 'api/courses';

    private readonly courses: Map<number, SubjectObservablePair<Course>> = new Map();

    private coursesForNotifications: BehaviorSubject<Course[] | undefined> = new BehaviorSubject<Course[] | undefined>(undefined);
    private fetchingCoursesForNotifications = false;

    constructor(private http: HttpClient, private exerciseService: ExerciseService, private lectureService: LectureService, private accountService: AccountService) {}

    /**
     * creates a course using a POST request
     * @param course - the course to be created on the server
     */
    create(course: Course): Observable<EntityResponseType> {
        const copy = CourseManagementService.convertDateFromClient(course);
        return this.http.post<Course>(this.resourceUrl, copy, { observe: 'response' }).pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * updates a course using a PUT request
     * @param course - the course to be updated
     */
    update(course: Course): Observable<EntityResponseType> {
        const copy = CourseManagementService.convertDateFromClient(course);
        return this.http.put<Course>(this.resourceUrl, copy, { observe: 'response' }).pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * finds the course with the provided unique identifier
     * @param courseId - the id of the course to be found
     */
    find(courseId: number): Observable<EntityResponseType> {
        return this.http.get<Course>(`${this.resourceUrl}/${courseId}`, { observe: 'response' }).pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * gets course information required for the course management detail page
     * @param courseId the id of the course of which the detailed data should be fetched
     */
    getCourseStatisticsForDetailView(courseId: number): Observable<HttpResponse<CourseManagementDetailViewDto>> {
        return this.http
            .get<CourseManagementDetailViewDto>(`${this.resourceUrl}/${courseId}/management-detail`, { observe: 'response' })
            .pipe(filter((res: HttpResponse<CourseManagementDetailViewDto>) => !!res.body));
    }

    /**
     * gets the active users for the line chart in the detail view
     * @param courseId the id of the course of which the statistics should be fetched
     * @param periodIndex the period of the statistics we want to have
     */
    getStatisticsData(courseId: number, periodIndex: number): Observable<number[]> {
        const params = new HttpParams().set('periodIndex', '' + periodIndex);
        return this.http.get<number[]>(`${this.resourceUrl}/${courseId}/statistics`, { params });
    }

    /**
     * Fetches the title of the course with the given id
     *
     * @param courseId the id of the course
     * @return the title of the course in an HttpResponse, or an HttpErrorResponse on error
     */
    getTitle(courseId: number): Observable<HttpResponse<string>> {
        return this.http.get(`${this.resourceUrl}/${courseId}/title`, { observe: 'response', responseType: 'text' });
    }

    /**
     * finds the course with the provided unique identifier together with its exercises
     * @param courseId - the id of the course to be found
     */
    findWithExercises(courseId: number): Observable<EntityResponseType> {
        return this.http
            .get<Course>(`${this.resourceUrl}/${courseId}/with-exercises`, { observe: 'response' })
            .pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * finds the course with the provided unique identifier together with its exercises and participants
     * @param courseId - the id of the course to be found
     */
    findWithExercisesAndParticipations(courseId: number): Observable<EntityResponseType> {
        return this.http
            .get<Course>(`${this.resourceUrl}/${courseId}/with-exercises-and-relevant-participations`, { observe: 'response' })
            .pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * finds a course with the given id and eagerly loaded organizations
     * @param courseId the id of the course to be found
     */
    findWithOrganizations(courseId: number): Observable<EntityResponseType> {
        return this.http
            .get<Course>(`${this.resourceUrl}/${courseId}/with-organizations`, { observe: 'response' })
            .pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    // TODO: separate course overview and course management REST API calls in a better way
    /**
     * finds all courses using a GET request
     */
    findAllForDashboard(): Observable<EntityArrayResponseType> {
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(`${this.resourceUrl}/for-dashboard`, { observe: 'response' }).pipe(
            map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)),
            map((res: EntityArrayResponseType) => this.setParticipationStatusForExercisesInCourses(res)),
            map((res: EntityArrayResponseType) => this.setCoursesForNotifications(res)),
        );
    }

    findOneForDashboard(courseId: number): Observable<EntityResponseType> {
        return this.http.get<Course>(`${this.resourceUrl}/${courseId}/for-dashboard`, { observe: 'response' }).pipe(
            map((res: EntityResponseType) => this.processCourseEntityResponseType(res)),
            map((res: EntityResponseType) => this.setParticipationStatusForExercisesInCourse(res)),
            tap((res: EntityResponseType) => this.courseWasUpdated(res.body)),
        );
    }

    courseWasUpdated(course: Course | null): void {
        if (course) {
            return this.courses.get(course.id!)?.subject.next(course);
        }
    }

    getCourseUpdates(courseId: number): Observable<Course> {
        if (!this.courses.has(courseId)) {
            this.courses.set(courseId, new SubjectObservablePair());
        }
        return this.courses.get(courseId)!.observable;
    }

    /**
     * finds all participants of the course corresponding to the given unique identifier
     * @param courseId - the id of the course
     */
    findAllParticipationsWithResults(courseId: number): Observable<StudentParticipation[]> {
        return this.http.get<StudentParticipation[]>(`${this.resourceUrl}/${courseId}/participations`);
    }

    /**
     * finds all results of exercises of the course corresponding to the given unique identifier for the current user
     * @param courseId - the id of the course
     */
    findAllResultsOfCourseForExerciseAndCurrentUser(courseId: number): Observable<Course> {
        return this.http.get<Course>(`${this.resourceUrl}/${courseId}/results`).pipe(map((res: Course) => this.setAccessRightsCourse(res)));
    }

    /**
     * finds all courses that can be registered to
     */
    findAllToRegister(): Observable<EntityArrayResponseType> {
        return this.http
            .get<Course[]>(`${this.resourceUrl}/to-register`, { observe: 'response' })
            .pipe(map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)));
    }

    /**
     * returns the course with the provided unique identifier for the assessment dashboard
     * @param courseId - the id of the course
     */
    getCourseWithInterestingExercisesForTutors(courseId: number): Observable<EntityResponseType> {
        const url = `${this.resourceUrl}/${courseId}/for-assessment-dashboard`;
        return this.http.get<Course>(url, { observe: 'response' }).pipe(map((res: EntityResponseType) => this.processCourseEntityResponseType(res)));
    }

    /**
     * returns the stats of the course with the provided unique identifier for the assessment dashboard
     * @param courseId - the id of the course
     */
    getStatsForTutors(courseId: number): Observable<HttpResponse<StatsForDashboard>> {
        return this.http.get<StatsForDashboard>(`${this.resourceUrl}/${courseId}/stats-for-assessment-dashboard`, { observe: 'response' });
    }

    /**
     * register to the course with the provided unique identifier using a POST request
     * NB: the body is null, because the server can identify the user anyway
     * @param courseId - the id of the course
     */
    registerForCourse(courseId: number): Observable<HttpResponse<User>> {
        return this.http.post<User>(`${this.resourceUrl}/${courseId}/register`, null, { observe: 'response' }).pipe(
            map((res: HttpResponse<User>) => {
                if (res.body != undefined) {
                    this.accountService.syncGroups(res.body);
                }
                return res;
            }),
        );
    }

    /**
     * finds all courses using a GET request
     * @param req
     */
    getAll(req?: any): Observable<EntityArrayResponseType> {
        const options = createRequestOption(req);
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(this.resourceUrl, { params: options, observe: 'response' }).pipe(
            map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)),
            map((res: EntityArrayResponseType) => this.setCoursesForNotifications(res)),
        );
    }

    /**
     * finds all courses with quiz exercises using a GET request
     */
    getAllCoursesWithQuizExercises(): Observable<EntityArrayResponseType> {
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(this.resourceUrl + '/courses-with-quiz', { observe: 'response' }).pipe(
            map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)),
            map((res: EntityArrayResponseType) => this.setCoursesForNotifications(res)),
        );
    }

    /**
     * finds all courses together with user stats using a GET request
     * @param req
     */
    getWithUserStats(req?: any): Observable<EntityArrayResponseType> {
        const options = createRequestOption(req);
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(`${this.resourceUrl}/with-user-stats`, { params: options, observe: 'response' }).pipe(
            map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)),
            map((res: EntityArrayResponseType) => this.setCoursesForNotifications(res)),
        );
    }

    /**
     * finds all courses for the overview using a GET request
     * @param req a dictionary which is send as request option along the REST call
     */
    getCourseOverview(req?: any): Observable<HttpResponse<Course[]>> {
        const options = createRequestOption(req);
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(`${this.resourceUrl}/course-management-overview`, { params: options, observe: 'response' }).pipe(
            tap((res: HttpResponse<Course[]>) => {
                if (res.body) {
                    res.body.forEach((course) => this.accountService.setAccessRightsForCourse(course));
                }
            }),
        );
    }

    /**
     * deletes the course corresponding to the given unique identifier using a DELETE request
     * @param courseId - the id of the course to be deleted
     */
    delete(courseId: number): Observable<HttpResponse<void>> {
        return this.http.delete<void>(`${this.resourceUrl}/${courseId}`, { observe: 'response' });
    }

    /**
     * returns the exercise details of the courses for the courses management dashboard
     * @param onlyActive - if true, only active courses will be considered in the result
     */
    getExercisesForManagementOverview(onlyActive: boolean): Observable<HttpResponse<Course[]>> {
        let httpParams = new HttpParams();
        httpParams = httpParams.append('onlyActive', onlyActive.toString());
        return this.http
            .get<Course[]>(`${this.resourceUrl}/exercises-for-management-overview`, { params: httpParams, observe: 'response' })
            .pipe(map((res: HttpResponse<Course[]>) => this.processCourseEntityArrayResponseType(res)));
    }

    /**
     * returns the stats of the courses for the courses management dashboard
     * @param onlyActive - if true, only active courses will be considered in the result
     */
    getStatsForManagementOverview(onlyActive: boolean): Observable<HttpResponse<CourseManagementOverviewStatisticsDto[]>> {
        let httpParams = new HttpParams();
        httpParams = httpParams.append('onlyActive', onlyActive.toString());
        return this.http.get<CourseManagementOverviewStatisticsDto[]>(`${this.resourceUrl}/stats-for-management-overview`, { params: httpParams, observe: 'response' });
    }

    /**
     * returns all the categories of the course corresponding to the given unique identifier
     * @param courseId - the id of the course
     */
    findAllCategoriesOfCourse(courseId: number): Observable<HttpResponse<string[]>> {
        return this.http.get<string[]>(`${this.resourceUrl}/${courseId}/categories`, { observe: 'response' });
    }

    /**
     * returns all the users in the the given group of the course corresponding to the given unique identifier
     * @param courseId - the id of the course
     * @param courseGroup - the course group we want to get users from
     */
    getAllUsersInCourseGroup(courseId: number, courseGroup: CourseGroup): Observable<HttpResponse<User[]>> {
        return this.http.get<User[]>(`${this.resourceUrl}/${courseId}/${courseGroup}`, { observe: 'response' });
    }

    /**
     * Downloads the course archive of the specified courseId. Returns an error
     * if the archive does not exist.
     * @param courseId The id of the course
     */
    downloadCourseArchive(courseId: number): Observable<HttpResponse<Blob>> {
        return this.http.get(`${this.resourceUrl}/${courseId}/download-archive`, {
            observe: 'response',
            responseType: 'blob',
        });
    }

    /**
     * Archives the course of the specified courseId.
     * @param courseId The id of the course to archive
     */
    archiveCourse(courseId: number): Observable<HttpResponse<any>> {
        return this.http.put(`${this.resourceUrl}/${courseId}/archive`, {}, { observe: 'response' });
    }

    cleanupCourse(courseId: number): Observable<HttpResponse<void>> {
        return this.http.delete<void>(`${this.resourceUrl}/${courseId}/cleanup`, { observe: 'response' });
    }

    /**
     * Find all locked submissions of a given course for user
     * @param {number} courseId - The id of the course to be searched for
     */
    findAllLockedSubmissionsOfCourse(courseId: number): Observable<HttpResponse<Submission[]>> {
        return this.http.get<Submission[]>(`${this.resourceUrl}/${courseId}/lockedSubmissions`, { observe: 'response' }).pipe(
            filter((res) => !!res.body),
            tap((res) =>
                res.body!.forEach((submission: Submission) => {
                    // reconnect some associations
                    const latestResult = getLatestSubmissionResult(submission);
                    if (latestResult) {
                        latestResult.submission = submission;
                        latestResult.participation = submission.participation;
                        submission.participation!.results = [latestResult!];
                        setLatestSubmissionResult(submission, latestResult);
                    }
                }),
            ),
        );
    }

    /**
     * adds a user to the given courseGroup of the course corresponding to the given unique identifier using a POST request
     * @param courseId - the id of the course
     * @param courseGroup - the course group we want to add a user to
     * @param login - login of the user to be added
     */
    addUserToCourseGroup(courseId: number, courseGroup: CourseGroup, login: string): Observable<HttpResponse<void>> {
        return this.http.post<void>(`${this.resourceUrl}/${courseId}/${courseGroup}/${login}`, {}, { observe: 'response' });
    }

    /**
     * removes a user from the given group of the course corresponding to the given unique identifier using a DELETE request
     * @param courseId - the id of the course
     * @param courseGroup - the course group
     * @param login - login of the user to be removed
     */
    removeUserFromCourseGroup(courseId: number, courseGroup: CourseGroup, login: string): Observable<HttpResponse<void>> {
        return this.http.delete<void>(`${this.resourceUrl}/${courseId}/${courseGroup}/${login}`, { observe: 'response' });
    }

    /**
     * Gets the cached courses. If there none the courses for the current user will be fetched.
     * @returns {BehaviorSubject<Course[] | undefined>}
     */
    getCoursesForNotifications(): BehaviorSubject<Course[] | undefined> {
        // The timeout is set to ensure that the request for retrieving courses
        // here is only made if there was no similar request made before.
        setTimeout(() => {
            // Retrieve courses if no courses were fetched before and are not queried at the moment.
            if (!this.fetchingCoursesForNotifications && !this.coursesForNotifications.getValue()) {
                this.findAllForNotifications().subscribe(
                    (res: HttpResponse<Course[]>) => {
                        this.coursesForNotifications.next(res.body || undefined);
                    },
                    () => (this.fetchingCoursesForNotifications = false),
                );
            }
        }, 500);
        return this.coursesForNotifications;
    }

    /**
     * This method bundles recurring conversion steps for Course EntityResponses.
     * @param courseRes
     * @private
     */
    private processCourseEntityResponseType(courseRes: EntityResponseType): EntityResponseType {
        this.convertDateFromServer(courseRes);
        this.setAccessRightsCourseEntityResponseType(courseRes);
        this.convertExerciseCategoriesFromServer(courseRes);
        return courseRes;
    }

    /**
     * This method bundles recurring conversion steps for Course processCourseEntityArrayResponseType.
     * @param courseRes
     * @private
     */
    private processCourseEntityArrayResponseType(courseRes: EntityArrayResponseType): EntityArrayResponseType {
        this.convertDateArrayFromServer(courseRes);
        this.convertExerciseCategoryArrayFromServer(courseRes);
        this.setAccessRightsCourseEntityArrayResponseType(courseRes);
        return courseRes;
    }

    private setCoursesForNotifications(res: EntityArrayResponseType): EntityArrayResponseType {
        if (res.body) {
            this.coursesForNotifications.next(res.body);
            this.fetchingCoursesForNotifications = false;
        }
        return res;
    }

    private static convertDateFromClient(course: Course): Course {
        // copy of the object
        return Object.assign({}, course, {
            startDate: course.startDate && dayjs(course.startDate).isValid() ? course.startDate.toJSON() : undefined,
            endDate: course.endDate && dayjs(course.endDate).isValid() ? course.endDate.toJSON() : undefined,
        });
    }

    private convertDateFromServer(res: EntityResponseType): EntityResponseType {
        if (res.body) {
            this.setCourseDates(res.body);
        }
        return res;
    }

    private convertDateArrayFromServer(res: EntityArrayResponseType): EntityArrayResponseType {
        if (res.body) {
            res.body.forEach((course: Course) => this.setCourseDates(course));
        }
        return res;
    }

    /**
     * Converts the exercise category json string into ExerciseCategory objects (if it exists).
     * @param res the response
     * @private
     */
    private convertExerciseCategoriesFromServer(res: EntityResponseType): EntityResponseType {
        if (res.body && res.body.exercises) {
            res.body.exercises.forEach((exercise) => this.exerciseService.parseExerciseCategories(exercise));
        }
        return res;
    }

    /**
     * Converts an array of exercise category json strings into ExerciseCategory objects (if it exists).
     * @param res the response
     * @private
     */
    private convertExerciseCategoryArrayFromServer(res: EntityArrayResponseType): EntityArrayResponseType {
        if (res.body) {
            res.body.forEach((course: Course) => {
                if (course.exercises) {
                    course.exercises.forEach((exercise) => this.exerciseService.parseExerciseCategories(exercise));
                }
            });
        }
        return res;
    }

    private setCourseDates(course: Course) {
        course.startDate = course.startDate ? dayjs(course.startDate) : undefined;
        course.endDate = course.endDate ? dayjs(course.endDate) : undefined;
        course.exercises = this.exerciseService.convertExercisesDateFromServer(course.exercises);
        course.lectures = this.lectureService.convertDatesForLecturesFromServer(course.lectures);
    }

    private setAccessRightsCourseEntityArrayResponseType(res: EntityArrayResponseType): EntityArrayResponseType {
        if (res.body) {
            res.body.forEach((course: Course) => {
                this.setAccessRightsCourse(course);
            });
        }
        return res;
    }

    private setAccessRightsCourseEntityResponseType(res: EntityResponseType): EntityResponseType {
        if (res.body) {
            this.setAccessRightsCourse(res.body);
        }
        return res;
    }

    /**
     * To reduce the error proneness the access rights for exercises and their
     * referenced course are set in addition to the course access rights itself.
     * @param course the course for which the access rights are set
     * @private
     */
    private setAccessRightsCourse(course: Course): Course {
        if (course) {
            this.accountService.setAccessRightsForCourse(course);
            if (course.exercises) {
                course.exercises.forEach((exercise: Exercise) => {
                    this.accountService.setAccessRightsForExercise(exercise);
                    if (exercise.course) {
                        this.accountService.setAccessRightsForCourse(exercise.course);
                    }
                });
            }
        }
        return course;
    }

    private setParticipationStatusForExercisesInCourse(res: EntityResponseType): EntityResponseType {
        if (res.body?.exercises) {
            res.body.exercises.forEach((exercise) => (exercise.participationStatus = participationStatus(exercise)));
        }
        return res;
    }

    private setParticipationStatusForExercisesInCourses(res: EntityArrayResponseType): EntityArrayResponseType {
        if (res.body) {
            res.body.forEach((course: Course) => {
                if (course.exercises) {
                    course.exercises.forEach((exercise) => (exercise.participationStatus = participationStatus(exercise)));
                }
            });
        }
        return res;
    }

    private findAllForNotifications(): Observable<EntityArrayResponseType> {
        this.fetchingCoursesForNotifications = true;
        return this.http.get<Course[]>(`${this.resourceUrl}/for-notifications`, { observe: 'response' }).pipe(
            map((res: EntityArrayResponseType) => this.processCourseEntityArrayResponseType(res)),
            map((res: EntityArrayResponseType) => this.setCoursesForNotifications(res)),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class CourseExerciseService {
    private resourceUrl = SERVER_API_URL + `api/courses`;

    constructor(
        private http: HttpClient,
        private participationWebsocketService: ParticipationWebsocketService,
        private exerciseService: ExerciseService,
        private accountService: AccountService,
    ) {}

    /**
     * returns all programming exercises for the course corresponding to courseId
     * Note: the exercises in the response do not contain participations and do not contain the course to save network bandwidth
     * @param courseId
     */
    findAllProgrammingExercisesForCourse(courseId: number): Observable<HttpResponse<ProgrammingExercise[]>> {
        return this.http
            .get<ProgrammingExercise[]>(`${this.resourceUrl}/${courseId}/programming-exercises/`, { observe: 'response' })
            .pipe(map((res: HttpResponse<ProgrammingExercise[]>) => this.processExercisesHttpResponses(res)));
    }

    /**
     * returns all modeling exercises for the course corresponding to courseId
     * Note: the exercises in the response do not contain participations and do not contain the course to save network bandwidth
     * @param courseId - the unique identifier of the course
     */
    findAllModelingExercisesForCourse(courseId: number): Observable<HttpResponse<ModelingExercise[]>> {
        return this.http
            .get<ModelingExercise[]>(`${this.resourceUrl}/${courseId}/modeling-exercises/`, { observe: 'response' })
            .pipe(map((res: HttpResponse<ModelingExercise[]>) => this.processExercisesHttpResponses(res)));
    }

    /**
     * returns all text exercises for the course corresponding to courseId
     * Note: the exercises in the response do not contain participations and do not contain the course to save network bandwidth
     * @param courseId - the unique identifier of the course
     */
    findAllTextExercisesForCourse(courseId: number): Observable<HttpResponse<TextExercise[]>> {
        return this.http
            .get<TextExercise[]>(`${this.resourceUrl}/${courseId}/text-exercises/`, { observe: 'response' })
            .pipe(map((res: HttpResponse<TextExercise[]>) => this.processExercisesHttpResponses(res)));
    }

    /**
     * returns all file upload exercises for the course corresponding to courseId
     * Note: the exercises in the response do not contain participations and do not contain the course to save network bandwidth
     * @param courseId - the unique identifier of the course
     */
    findAllFileUploadExercisesForCourse(courseId: number): Observable<HttpResponse<FileUploadExercise[]>> {
        return this.http
            .get<FileUploadExercise[]>(`${this.resourceUrl}/${courseId}/file-upload-exercises/`, { observe: 'response' })
            .pipe(map((res: HttpResponse<FileUploadExercise[]>) => this.processExercisesHttpResponses(res)));
    }

    /**
     * This method bundles recurring conversion steps for Course Exercise HttpResponses.
     * @param exercisesRes
     * @private
     */
    private processExercisesHttpResponses(exercisesRes: HttpResponse<Exercise[]>): HttpResponse<Exercise[]> {
        this.convertDateArrayFromServer(exercisesRes);
        this.exerciseService.convertExerciseCategoryArrayFromServer(exercisesRes);
        if (exercisesRes.body) {
            exercisesRes.body.forEach((exercise) => this.accountService.setAccessRightsForExercise(exercise));
        }
        return exercisesRes;
    }

    /**
     * starts the exercise with the identifier exerciseId for the course corresponding to courseId
     * @param courseId - the unique identifier of the course
     * @param exerciseId - the unique identifier of the modelling exercise
     */
    startExercise(courseId: number, exerciseId: number): Observable<StudentParticipation> {
        return this.http.post<StudentParticipation>(`${this.resourceUrl}/${courseId}/exercises/${exerciseId}/participations`, {}).pipe(
            map((participation: StudentParticipation) => {
                if (participation.type === ParticipationType.PROGRAMMING) {
                    addUserIndependentRepositoryUrl(participation);
                }
                return this.handleParticipation(participation);
            }),
        );
    }

    /**
     * resumes the programming exercise with the identifier exerciseId for the course corresponding to courseId
     * @param courseId - the unique identifier of the course
     * @param exerciseId - the unique identifier of the modelling exercise
     */
    resumeProgrammingExercise(courseId: number, exerciseId: number): Observable<StudentParticipation> {
        return this.http.put<StudentParticipation>(`${this.resourceUrl}/${courseId}/exercises/${exerciseId}/resume-programming-participation`, {}).pipe(
            map((participation: StudentParticipation) => {
                if (participation.type === ParticipationType.PROGRAMMING) {
                    addUserIndependentRepositoryUrl(participation);
                }
                return this.handleParticipation(participation);
            }),
        );
    }

    /**
     * handle the given student participation by adding in the participationWebsocketService
     * @param participation - the participation to be handled
     */
    handleParticipation(participation: StudentParticipation) {
        if (participation) {
            // convert date
            participation.initializationDate = participation.initializationDate ? dayjs(participation.initializationDate) : undefined;
            if (participation.exercise) {
                const exercise = participation.exercise;
                exercise.dueDate = exercise.dueDate ? dayjs(exercise.dueDate) : undefined;
                exercise.releaseDate = exercise.releaseDate ? dayjs(exercise.releaseDate) : undefined;
                exercise.studentParticipations = [participation];
            }
            this.participationWebsocketService.addParticipation(participation);
        }
        return participation;
    }

    convertDateFromServer<T extends Exercise>(res: T): T {
        res.releaseDate = res.releaseDate ? dayjs(res.releaseDate) : undefined;
        res.dueDate = res.dueDate ? dayjs(res.dueDate) : undefined;
        return res;
    }

    protected convertDateArrayFromServer<T extends Exercise>(res: HttpResponse<T[]>): HttpResponse<T[]> {
        if (res.body) {
            res.body.forEach((exercise: T) => {
                exercise.releaseDate = exercise.releaseDate ? dayjs(exercise.releaseDate) : undefined;
                exercise.dueDate = exercise.dueDate ? dayjs(exercise.dueDate) : undefined;
                exercise.assessmentDueDate = exercise.assessmentDueDate ? dayjs(exercise.assessmentDueDate) : undefined;
            });
        }
        return res;
    }
}
